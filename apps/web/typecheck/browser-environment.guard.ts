// @ts-expect-error Shipping browser code must not have access to Node's process global.
export type NodeProcessMustRemainUnavailable = typeof process;
