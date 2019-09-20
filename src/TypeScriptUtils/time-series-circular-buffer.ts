// tslint:disable: indent

import _ from "lodash";
import moment from "moment";
import assert from "assert";

export class TimeSeriesCircularBuffer<T> extends Map<number, T> {

    constructor(private maxAge: number) {

        super();

        setTimeout(this.purge, 2000);
    }

    public enq = (ts: number, volume: T) => {

        this.set(ts, volume);
    }

    public volume = (): number => {

        try {
            return Array
                .from(this.values())
                .reduce(
                    (sum, current: T) => {
                        if (typeof (current) === "number") {
                            return sum + current;
                        } else {
                            assert(false, `Software Failure`);
                            return 0;
                        }
                    }, 0);
        } catch (err) {
            throw err;
        }
    }

    private purge = () => {

        try {
            for (const ts of this.keys()) {

                if (ts < +moment() - this.maxAge) {
                    this.delete(ts);
                }
            }
        } finally {
            // @ts-ignore
            global.active ? setTimeout(this.purge, 2000) : _.noop;
        }
    }
}
