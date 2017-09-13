export function getKeyByValue(object: any, value: any): string { //tslint:disable-line
  return Object.keys(object).find((key: string) => object[key] === value);
}
