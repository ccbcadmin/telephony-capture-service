// tslint:disable
import { Observable, Subscription } from 'rxjs';
import moment from "moment";
import _ from "lodash";
import {
    logFatal,
    logError,
    logWarn,
    logInfo,
    logDebug,
    logTrace
} from './logger';
import { debugBroker } from './debug';

import amqp from "amqplib";

const envalid = require("envalid");
const { str, num } = envalid;
const env = envalid.cleanEnv(process.env, {
    RABBITMQ_DEFAULT_USER: str(),
    RABBITMQ_DEFAULT_PASS: str(),
    RABBITMQ_NODE_PORT: str(),
    RABBITMQ_HOST: str(),
    RABBITMQ_EXCHANGE: str()
});

export interface BrokerParams {
    disconnectHandler: any,
    connectHandler? (): Promise<void>,
    topics: Array<{ routingKey: string, dataSink: any }>;
    dataSinkError?: any
}

export class Broker {

    private connection: amqp.Connection | undefined;
    public channel: amqp.Channel | undefined;
    private retryConnectTimer$ = Observable.timer(0, 5000).startWith();
    private retryConnectSubscription: Subscription | undefined;

    constructor(private brokerParams: BrokerParams) {

        setTimeout(this.retryConnection, 5000);
        debugBroker({ brokerParams });
    }

    private retryConnection = () => {

        try {
            this.retryConnectSubscription = this.retryConnectTimer$.subscribe(

                async (data: any) => {
                    try {
                        await this.connect();
                    } catch (err) {
                        debugBroker(`retryConnectSubscription() Error: ${err.message}`);
                    }
                },

                (err: any) => {
                    debugBroker('Broker Retry Error', err);
                });

        } catch (err) {
            throw err;
        }
    }

    private closeEvent = (event: any) => {

        debugBroker(`Broker Close Event: `, { event });

        // Inform the client
        this.brokerParams.disconnectHandler ? this.brokerParams.disconnectHandler() : _.noop;

        // Stop listening to queue events
        this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
        this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

        this.retryConnection();
    }

    private errorEvent = (err: any) => {

        // Take note of the error - no further action required
        debugBroker(`Broker Error Event: ${JSON.stringify(err, null, 4)}`);
    }

    private connect = async (): Promise<void> => {

        try {

            const connectString = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_NODE_PORT}`;
            this.connection = await amqp.connect(connectString);

            // Stop retrying
            this.retryConnectSubscription ?
                this.retryConnectSubscription.unsubscribe() :
                _.noop;

            this.connection.addListener("error", this.errorEvent);
            this.connection.addListener("close", this.closeEvent);

            this.channel = await this.connection.createChannel();
            this.channel.prefetch(1);

            debugBroker('Channel Created');

            await this.channel.assertExchange(process.env.RABBITMQ_EXCHANGE!, 'topic', { durable: true });

            for (const topic of this.brokerParams.topics) {

                const q = await this.channel.assertQueue(topic.routingKey, { durable: false });
                await this.channel.bindQueue(q.queue, process.env.RABBITMQ_EXCHANGE!, topic.routingKey);

                await this.channel.consume(q.queue, async (msg: any) => {

                    try {
                        await topic.dataSink(JSON.parse(msg.content.toString()));
                        this.channel ? this.channel.ack(msg) : _.noop;

                    } catch (err) {
                        logError(err.message, err);
                        if (this.brokerParams.dataSinkError) {
                            this.brokerParams.dataSinkError();
                        }
                    }
                }, { noAck: false });
            }

            debugBroker('Connect Handler Available:', Boolean(this.brokerParams.connectHandler));
            this.brokerParams.connectHandler ? this.brokerParams.connectHandler() : _.noop;
            debugBroker('Connect Handler Called');

        } catch (err) {
            debugBroker('Broker Error:', err.message);
            logFatal(err.message);
            return Promise.reject(new Error(err.message));
        }
    }

    public publish = (key: string, msg: Buffer): boolean =>
        this.channel ?
            this.channel.publish(process.env.RABBITMQ_EXCHANGE!, key, msg, { persistent: false }) :
            false;

    public close = () => {

        // Stop listening to queue events
        this.channel ? this.channel.close() : _.noop;

        this.connection ? this.connection.removeListener("close", this.closeEvent) : _.noop;
        this.connection ? this.connection.removeListener("error", this.errorEvent) : _.noop;

        this.connection ? this.connection.close() : _.noop;
    }
}
