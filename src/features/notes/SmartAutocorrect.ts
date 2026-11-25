import { Extension, InputRule, textInputRule } from "@tiptap/core";

const SYMBOL_RULES: Array<[RegExp, string]> = [
  [/->$/, "→"],
  [/<-$/, "←"],
  [/=>$/, "⇒"],
  [/!=$/, "≠"],
  [/<=$/, "≤"],
  [/>=$/, "≥"],
  [/--$/, "—"],
];

const TYPO_PAIRS: Array<[string, string]> = [
  ["teh", "the"],
  ["adn", "and"],
  ["wich", "which"],
  ["thier", "their"],
  ["becuase", "because"],
  ["untill", "until"],
  ["recieve", "receive"],
  ["beleive", "believe"],
  ["acheive", "achieve"],
  ["seperate", "separate"],
  ["definately", "definitely"],
  ["occured", "occurred"],
  ["wierd", "weird"],
  ["calender", "calendar"],
  ["commited", "committed"],
  ["enviroment", "environment"],
  ["goverment", "government"],
  ["independant", "independent"],
  ["knowlege", "knowledge"],
  ["neccessary", "necessary"],
  ["occassion", "occasion"],
  ["publically", "publicly"],
  ["refered", "referred"],
  ["tommorow", "tomorrow"],
];

function wordTypoRule(wrong: string, right: string) {
  return new InputRule({
    find: new RegExp(`(^|\\s)${wrong}\\s$`),
    handler: ({ state, range, match }) => {
      const prefix = match[1] ?? "";
      state.tr.insertText(`${prefix}${right} `, range.from, range.to);
    },
  });
}

export const SmartAutocorrect = Extension.create({
  name: "smartAutocorrect",
  addInputRules() {
    const symbols = SYMBOL_RULES.map(([find, replace]) => textInputRule({ find, replace }));
    const typos = TYPO_PAIRS.flatMap(([wrong, right]) => {
      const capWrong = wrong[0].toUpperCase() + wrong.slice(1);
      const capRight = right[0].toUpperCase() + right.slice(1);
      return [wordTypoRule(wrong, right), wordTypoRule(capWrong, capRight)];
    });
    return [...symbols, ...typos];
  },
});
