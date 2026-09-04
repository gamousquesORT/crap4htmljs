Feature: Discovering functions in HTML inline scripts

  As a developer running crap4htmljs
  I want the tool to discover functions inside <script> elements embedded in HTML
  So that JavaScript authored directly in a page can be scored too

  Scenario: An HTML file with two inline scripts
    Given an HTML file "page.html" with the following content:
      """
      <!DOCTYPE html>
      <html>
      <head></head>
      <body>
        <script>
          function first() {
            return 1;
          }
        </script>
        <script type="module">
          const second = () => 2;
        </script>
      </body>
      </html>
      """
    When I analyze the file
    Then the analysis should discover 2 functions
    And the discovered functions should include:
      | name   | kind            | sourcePath           | complexity |
      | first  | function-declaration | page.html#script[1] | 1          |
      | second | arrow-function  | page.html#script[2]  | 1          |

  Scenario: An HTML file with a non-executable inline script
    Given an HTML file "page.html" with the following content:
      """
      <!DOCTYPE html>
      <html>
      <body>
        <script type="application/json">
          { "not": "javascript" }
        </script>
        <script>
          function real() {}
        </script>
      </body>
      </html>
      """
    When I analyze the file
    Then the analysis should discover 1 functions
    And the discovered functions should include:
      | name | kind                  | sourcePath           | complexity |
      | real | function-declaration  | page.html#script[2] | 1          |
