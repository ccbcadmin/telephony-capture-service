import _ from "lodash";

export const sortByObjectKeys = (obj: { [key: string]: any }): object => {

    const sortedObj: { [key: string]: any } = {};

    Object.keys(obj)
        .sort((a: string, b: string) =>
            _.toLower(a) >= _.toLower(b) ? 1 : -1)
        .forEach((key: string) => {
            return _.isObject(obj[key]) ?
                sortedObj[key] = sortByObjectKeys(obj[key]) :
                sortedObj[key] = obj[key];
        });

    return sortedObj;
}