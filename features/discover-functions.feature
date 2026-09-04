Feature: Discovering functions in a JavaScript file

  As a developer running crap4htmljs
  I want the tool to discover every function in a JavaScript source file
  So that each one can later be scored

  Scenario: A file with every supported function kind
    Given a JavaScript file "multiple-functions.js" with the following content:
      """
      function declared() {
        return 1;
      }

      const expr = function namedExpression() {
        return 2;
      };

      const arrow = () => 3;

      const inferred = function () {
        return 4;
      };

      class Thing {
        constructor() {
          this.value = 5;
        }

        method() {
          return 6;
        }

        get value() {
          return this._value;
        }

        set value(v) {
          this._value = v;
        }
      }

      const container = {
        objectMethod() {
          return 7;
        },
      };
      """
    When I analyze the file
    Then the analysis should discover 9 functions
    And the discovered functions should include:
      | name            | kind                  | complexity |
      | declared        | function-declaration  | 1          |
      | namedExpression | function-expression   | 1          |
      | arrow           | arrow-function        | 1          |
      | inferred        | function-expression   | 1          |
      | constructor     | constructor           | 1          |
      | method          | method                | 1          |
      | value           | getter                | 1          |
      | value           | setter                | 1          |
      | objectMethod    | object-method         | 1          |
