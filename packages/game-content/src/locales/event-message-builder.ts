interface TwoChoiceEventMessageInput<
  TEventStem extends string,
  TFirstChoiceStem extends string,
  TSecondChoiceStem extends string,
> {
  readonly eventStem: TEventStem;
  readonly name: string;
  readonly description: string;
  readonly firstChoiceStem: TFirstChoiceStem;
  readonly firstChoiceName: string;
  readonly firstChoiceDescription: string;
  readonly secondChoiceStem: TSecondChoiceStem;
  readonly secondChoiceName: string;
  readonly secondChoiceDescription: string;
}

type TwoChoiceEventMessageKey<
  TEventStem extends string,
  TFirstChoiceStem extends string,
  TSecondChoiceStem extends string,
> =
  | `events.${TEventStem}.name`
  | `events.${TEventStem}.description`
  | `events.${TEventStem}.choices.${TFirstChoiceStem}.name`
  | `events.${TEventStem}.choices.${TFirstChoiceStem}.description`
  | `events.${TEventStem}.choices.${TSecondChoiceStem}.name`
  | `events.${TEventStem}.choices.${TSecondChoiceStem}.description`;

export function defineTwoChoiceEventMessages<
  const TEventStem extends string,
  const TFirstChoiceStem extends string,
  const TSecondChoiceStem extends string,
>(
  input: TwoChoiceEventMessageInput<TEventStem, TFirstChoiceStem, TSecondChoiceStem>,
): Readonly<
  Record<TwoChoiceEventMessageKey<TEventStem, TFirstChoiceStem, TSecondChoiceStem>, string>
> {
  return {
    [`events.${input.eventStem}.name`]: input.name,
    [`events.${input.eventStem}.description`]: input.description,
    [`events.${input.eventStem}.choices.${input.firstChoiceStem}.name`]: input.firstChoiceName,
    [`events.${input.eventStem}.choices.${input.firstChoiceStem}.description`]:
      input.firstChoiceDescription,
    [`events.${input.eventStem}.choices.${input.secondChoiceStem}.name`]: input.secondChoiceName,
    [`events.${input.eventStem}.choices.${input.secondChoiceStem}.description`]:
      input.secondChoiceDescription,
  } as Record<TwoChoiceEventMessageKey<TEventStem, TFirstChoiceStem, TSecondChoiceStem>, string>;
}
