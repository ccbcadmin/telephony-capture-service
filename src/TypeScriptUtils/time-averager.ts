// tslint:disable: indent

import _ from "lodash";
const now = require("performance-now");
const CircularBuffer = require("circular-buffer");

export class TimeAverager {

	private timeBuffer: any;
	private now: number;
	constructor(size: number = 100) {
		this.timeBuffer = new CircularBuffer(size);
		this.now = now();
	}

	public avg = (value: number | undefined = undefined): number => {

		if (_.isUndefined(value)) {

			this.timeBuffer.enq(now() - this.now);
			this.now = now();

		} else {

			this.timeBuffer.enq(value);
		}

		return ((this.timeBuffer
			.toarray()
			.reduce((a: number, b: number) =>
				a + b, 0)) / this.timeBuffer.size());
	}

	public enq = (value: number): void => {

		this.timeBuffer.enq(value);
	}

	public size = (): number => this.timeBuffer.size();
	public capacity = (): number => this.timeBuffer.capacity();

	public clear = (): void => {
		while (this.timeBuffer.size() > 0) this.timeBuffer.pop();
	}

	public get = (): number => {

		return ((this.timeBuffer
			.toarray()
			.reduce((a: number, b: number) =>
				a + b, 0)) / this.timeBuffer.size());
	}
}
