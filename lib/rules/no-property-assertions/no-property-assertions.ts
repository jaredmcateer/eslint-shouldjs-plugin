import { Node } from "@typescript-eslint/types/dist/generated/ast-spec";
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";
import { createRule } from "../../utils/create-rule";

export const NO_PROPERTY_ASSERTIONS = "no-property-assertions";
export const PROPERTY_ASSERTION_ERROR = "propertyAssertionError";

type MessageIds = typeof PROPERTY_ASSERTION_ERROR;
interface Options {
  name?: string[] | ["should"];
}
type NoPropertyAssertionContext = RuleContext<MessageIds, [Options]>;

export const noPropertyAssertions = createRule<[Options], MessageIds>({
  name: NO_PROPERTY_ASSERTIONS,
  meta: {
    docs: {
      description: "Should-js assertions should be methods.",
      recommended: "error",
      requiresTypeChecking: false,
    },
    messages: {
      [PROPERTY_ASSERTION_ERROR]: "Should-js assertions should be methods.",
    },
    schema: [
      {
        type: "object",
        properties: {
          name: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
    ],
    hasSuggestions: false,
    type: "problem",
  },
  defaultOptions: [{ name: ["should"] }],
  create(context, [options]) {
    const functionVarName = options.name;
    return {
      /**
       * When encountering an MemberExpression with 'should' as a property
       * identifier traverse the AST to find if the final MemberExpression is a
       * property or method. If it is a property report an error.
       * @param node
       * @returns
       */
      MemberExpression(node) {
        if (node?.property?.type !== AST_NODE_TYPES.Identifier) return;

        if (node.property.name !== "should") return;

        checkChain(node.parent, context);
      },

      /**
       * When encountering an CallExpression with expected name (i.e., should),
       * traverse the AST to find if the final MemberExpression is a property or
       * method. If it is a property report an error.
       * @param node
       * @returns
       */
      CallExpression(node) {
        if (node?.callee?.type !== AST_NODE_TYPES.Identifier) return;

        // If CallExpression isn't an expected variable name then stop here
        const name = node.callee.name;
        if (!functionVarName?.find((varName) => varName === name)) return;

        // CallExpression matches function variable name, begin traversing AST to check.
        checkChain(node.parent, context);
      },
    };
  },
});

function checkChain(parent: Node | undefined, context: Readonly<NoPropertyAssertionContext>) {
  let node = parent;
  while (node) {
    if (node.type === AST_NODE_TYPES.CallExpression) {
      // If we've hit a CallExpression then it's a method which is expected
      return;
    } else if (node.type === AST_NODE_TYPES.ExpressionStatement) {
      // If we've hit an expression statement, then it's not a method and we should report an error.
      context.report({ node, messageId: PROPERTY_ASSERTION_ERROR });
      return;
    } else if (node.type === AST_NODE_TYPES.MemberExpression) {
      node = node.parent;
    }
  }
}
