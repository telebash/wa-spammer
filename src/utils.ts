export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SerializePrisma<T> = T extends Buffer
  ? {
      type: 'Buffer';
      data: number[];
    }
  : T extends bigint
  ? string
  : T extends null
  ? never
  : T;

export type MakeSerializedPrisma<T extends Record<string, any>> = {
  [K in keyof T]: SerializePrisma<T[K]>;
};

export function serializePrisma<T extends Record<string, any>>(
  data: T,
  removeNullable = true
): MakeSerializedPrisma<T> {
  const obj = { ...data } as any;

  for (const [key, val] of Object.entries(obj)) {
    if (val instanceof Buffer) {
      obj[key] = val.toJSON();
    } else if (typeof val === 'bigint' || val instanceof BigInt) {
      obj[key] = val.toString();
    } else if (removeNullable && (typeof val === 'undefined' || val === null)) {
      delete obj[key];
    }
  }

  return obj;
}

export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
