export function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  for (const propertyValue of Object.values(value)) {
    deepFreeze(propertyValue);
  }

  return Object.isFrozen(value) ? value : Object.freeze(value);
}

export function cloneSerializable<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneSerializable(item)) as T;
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, propertyValue]) => [key, cloneSerializable(propertyValue)]),
  ) as T;
}
