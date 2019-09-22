import async from "async";
import { logError } from "./logger";
import { debugTcs } from "../Barrel";

// tslint:disable
const timer = (timeout: number) => new Promise((resolve, reject) => {
    try {
        setTimeout(resolve, timeout, null);
    } catch (err) {
        reject(err);
    }
});

const queuePush = (q: async.AsyncQueue<any>, task: any): Promise<void> =>

    new Promise((resolve, reject) => {
        try {
            q.push(task, (err) => {
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    });

(async () => {

    const q = async.queue(async (task: any, callback) => {

        await timer(1000);
        logError("Task: ", task.name);
        callback();
    }, 1);

    // assign a callback
    await q.drain();

    await queuePush(q, { name: "foo0" });
    logError('finished processing foo0');

    // add some items to the queue

    q.push({ name: 'bar1' }, (err) => {

        logError('finished processing bar');
    });

    q.push({ name: 'bar2' }, (err) => {

        logError('finished processing bar');
    });

    const testObj = { name: "foo" };

    await queuePush(q, testObj);

    await q.push(testObj);

    logError('finished processing foo');


    /*
    q.push(testObj, (err) => {

        delete testObj.name;
        logError('finished processing foo');
    });
    */

    // add some items to the queue (batch-wise)
    q.push([{ name: 'baz' }, { name: 'bay' }, { name: 'bax' }], function (err, data) {

        logError('finished processing item');

        debugTcs({ data });
    });

    // add some items to the front of the queue
    q.unshift({ name: 'bar' }, (err) => {

        logError('finished processing bar');
    });

    await timer(2000);

    const junk = () => {

        logError('Hi There!');
    }

    q.push({ name1: 'foo', name2: 'foo2' });


})();
