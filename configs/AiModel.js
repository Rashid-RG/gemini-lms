const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",  
  });
  
  // Optimized config for faster response times
  const generationConfig = {
    temperature: 0.8,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  };

  // Config for notes/text content
  const generationConfig2 = {
    temperature: 0.8,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
    responseMimeType: "text/plain",
  };
  

    export const courseOutlineAIModel = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Generate a study material for Python for  Exam and level of difficulty will be EASY with summery of course,List of Chapters along with summery for each chapter, Topic list in each chapter, All resule in JSON format\n\n"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\n  \"course_title\": \"Python for Beginners\",\n  \"difficulty\": \"Easy\",\n  \"summary\": \"This course provides an introduction to the Python programming language, covering the fundamentals necessary to write simple programs and understand basic programming concepts.\",\n  \"chapters\": [\n    {\n      \"chapter_title\": \"Introduction to Python\",\n      \"summary\": \"This chapter introduces the Python programming language, its history, and its uses. It also covers basic syntax and the concept of variables and data types.\",\n      \"topics\": [\n        \"What is Python?\",\n        \"Why use Python?\",\n        \"Installing Python\",\n        \"Running Python code\",\n        \"Basic syntax\",\n        \"Variables and data types\",\n        \"Operators\"\n      ]\n    },\n    {\n      \"chapter_title\": \"Control Flow\",\n      \"summary\": \"This chapter focuses on controlling the flow of execution in Python programs, including conditional statements, loops, and functions.\",\n      \"topics\": [\n        \"Conditional statements (if, elif, else)\",\n        \"Loops (for, while)\",\n        \"Loop control statements (break, continue)\",\n        \"Functions\"\n      ]\n    },\n    {\n      \"chapter_title\": \"Data Structures\",\n      \"summary\": \"This chapter introduces fundamental data structures in Python, such as lists, tuples, dictionaries, and sets.\",\n      \"topics\": [\n        \"Lists\",\n        \"Tuples\",\n        \"Dictionaries\",\n        \"Sets\"\n      ]\n    },\n    {\n      \"chapter_title\": \"Strings and Input/Output\",\n      \"summary\": \"This chapter covers working with strings, taking input from the user, and displaying output in Python programs.\",\n      \"topics\": [\n        \"String manipulation\",\n        \"String formatting\",\n        \"Input and output (input(), print())\"\n      ]\n    },\n    {\n      \"chapter_title\": \"Modules and Libraries\",\n      \"summary\": \"This chapter introduces the concept of modules and libraries in Python, allowing you to leverage pre-written code for various tasks.\",\n      \"topics\": [\n        \"What are modules and libraries?\",\n        \"Importing modules\",\n        \"Using built-in modules\",\n        \"Third-party libraries\"\n      ]\n    },\n    {\n      \"chapter_title\": \"Error Handling\",\n      \"summary\": \"This chapter covers how to handle errors in Python programs, ensuring graceful execution and preventing program crashes.\",\n      \"topics\": [\n        \"Types of errors\",\n        \"Try-except blocks\",\n        \"Raising exceptions\"\n      ]\n    }\n  ]\n}\n```"},
          ],
        },
      ],
    });

    export const generateNotesAiModel = model.startChat({
      generationConfig: generationConfig2,
    });

    export const GenerateStudyTypeContentAiModel = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Generate the flashcard on topic : Flutter Fundamentals,User Interface (UI) Development,Basic App Navigation in JSON format with front back content, Maximum 15"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n[\n  {\n    \"front\": \"What is a Widget in Flutter?\",\n    \"back\": \"A Widget is the basic building block of a Flutter UI. Everything you see on the screen is a widget, including layout elements, text, images, and more.  They are immutable and describe the UI.\"\n  },\n  {\n    \"front\": \"Explain the difference between StatelessWidget and StatefulWidget.\",\n    \"back\": \"StatelessWidget: Its UI doesn't change after it's built.  StatefulWidget: Its UI can change based on user interaction or other factors. It manages its own state using State objects.\"\n  },\n  {\n    \"front\": \"Name three common layout widgets in Flutter.\",\n    \"back\": \"Row, Column, and Stack are common layout widgets.  Row arranges children horizontally, Column vertically, and Stack overlays children.\"\n  },\n  {\n    \"front\": \"What is the purpose of a `BuildContext`?\",\n    \"back\": \"BuildContext provides information about the location of a widget within the widget tree. It's used to access the theme, parent widgets, and other contextual information.\"\n  },\n  {\n    \"front\": \"How do you display text in Flutter?\",\n    \"back\": \"Use the `Text` widget.  You can style it with properties like `style`, `textAlign`, `textDirection`, etc.\"\n  },\n  {\n    \"front\": \"How do you navigate to a new screen in Flutter?\",\n    \"back\": \"Use `Navigator.push(context, MaterialPageRoute(builder: (context) => NewScreen()));`  This pushes a new route onto the navigation stack.\"\n  },\n  {\n    \"front\": \"How do you pass data to a new screen during navigation?\",\n    \"back\": \"Pass data via the constructor of the new screen's widget.  You can also use named routes and pass arguments via `RouteSettings`.\"\n  },\n  {\n    \"front\": \"What is a `MaterialApp` widget?\",\n    \"back\": \"It's the root widget of a Flutter application that provides material design styling and navigation capabilities.\"\n  },\n  {\n    \"front\": \"What is the purpose of the `Scaffold` widget?\",\n    \"back\": \"Provides a basic visual layout structure for a Material Design app including an AppBar, Body, and Drawer.\"\n  },\n  {\n    \"front\": \"How do you handle user input in Flutter?\",\n    \"back\": \"Using widgets like `TextField` and `Checkbox` to capture user input. Then process these inputs within the state of a StatefulWidget.\"\n  },\n  {\n    \"front\": \"What are keys in Flutter widgets?\",\n    \"back\": \"Keys provide a way to uniquely identify widgets, especially when the structure of the widget tree changes dynamically. This helps Flutter manage the UI effectively during rebuilds.\"\n  },\n  {\n    \"front\": \"Explain the concept of a routing table in Flutter.\",\n    \"back\": \"A routing table (often implemented using `MaterialApp`'s `routes` property) maps named routes to widget builders, allowing for easy navigation to specific screens based on route names.\"\n  },\n  {\n    \"front\": \"What is the difference between `push` and `pushReplacementNamed` in navigation?\",\n    \"back\": \"`push` adds a new route to the navigation stack. `pushReplacementNamed` replaces the current route with a new one, removing the previous route from the stack.\"\n  },\n  {\n    \"front\": \"How to pop a route from the navigation stack?\",\n    \"back\": \"Use `Navigator.pop(context);` or `Navigator.pop(context, data);` to pop the current route and optionally return data to the previous screen.\"\n  },\n  {\n    \"front\": \"What's the role of `initState()` in a StatefulWidget?\",\n    \"back\": \"It's a lifecycle method called only once when the StatefulWidget is inserted into the widget tree. It's used for initializing state variables.\"\n  }\n]\n```\n"},
          ],
        },
      ],
    })

   export const GenerateQuizAiModel = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Generate Quiz on topic : Flutter Fundamentals,User Interface (UI) Development,Basic App Navigation with Question and Options along with correct answer in JSON format"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\n  \"quizTitle\": \"Flutter Fundamentals, UI Development & Basic Navigation\",\n  \"questions\": [\n    {\n      \"question\": \"What is the fundamental building block of a Flutter UI?\",\n      \"options\": [\"Widget\", \"Layout\", \"View\", \"Component\"],\n      \"answer\": \"Widget\"\n    },\n    {\n      \"question\": \"Which widget is used to arrange children in a column?\",\n      \"options\": [\"Row\", \"Column\", \"Stack\", \"Container\"],\n      \"answer\": \"Column\"\n    },\n    {\n      \"question\": \"What does `StatelessWidget` mean in Flutter?\",\n      \"options\": [\"A widget that changes its state based on user interaction\", \"A widget whose state never changes\", \"A widget that manages its own state\", \"A widget that relies on external state management\"],\n      \"answer\": \"A widget whose state never changes\"\n    },\n    {\n      \"question\": \"Which widget is best suited for creating a scrollable list of items?\",\n      \"options\": [\"ListView\", \"GridView\", \"Column\", \"Row\"],\n      \"answer\": \"ListView\"\n    },\n    {\n      \"question\": \"How do you navigate to a new screen in Flutter?\",\n      \"options\": [\"Using `Navigator.push`\", \"Using `setState`\", \"Using `BuildContext.push`\", \"Using `Navigator.pop`\"],\n      \"answer\": \"Using `Navigator.push`\"\n    },\n    {\n      \"question\": \"What does the `BuildContext` provide?\",\n      \"options\": [\"Access to the application's theme\", \"Information about the widget's position in the widget tree\", \"A way to access shared preferences\", \"A mechanism for handling user input\"],\n      \"answer\": \"Information about the widget's position in the widget tree\"\n    },\n    {\n      \"question\": \"Which widget is commonly used to display an image in Flutter?\",\n      \"options\": [\"Image.asset\", \"Image.network\", \"Icon\", \"Text\"],\n      \"answer\": \"Image.asset\"\n    },\n    {\n      \"question\": \"What is the purpose of a `Key` in Flutter?\",\n      \"options\": [\"To uniquely identify a widget\", \"To manage state changes\", \"To style widgets\", \"To handle user input\"],\n      \"answer\": \"To uniquely identify a widget\"\n    },\n    {\n      \"question\": \"How do you pass data to a new screen during navigation?\",\n      \"options\": [\"Using arguments in `Navigator.push`\", \"Using `setState`\", \"Using global variables\", \"Using shared preferences\"],\n      \"answer\": \"Using arguments in `Navigator.push`\"\n    },\n    {\n      \"question\": \"What is the role of a `Scaffold` widget?\",\n      \"options\": [\"Provides a basic visual layout structure\", \"Manages app state\", \"Handles navigation\", \"Displays images\"],\n      \"answer\": \"Provides a basic visual layout structure\"\n    }\n  ]\n}\n```\n"},
          ],
        },
      ],
    });

    export const AssignmentGradingAiModel = model.startChat({
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        responseMimeType: "application/json"
      },
      history: [
        {
          role: "user",
          parts: [
            {text: "Grade this student assignment on Python Functions: 'Functions are reusable blocks of code that perform a specific task. They help in code organization and reusability.' Score out of 100 and provide detailed feedback in JSON format with score, feedback, strengths, and improvements fields."},
          ],
        },
        {
          role: "model",
          parts: [
            {text: JSON.stringify({
              score: 75,
              feedback: "Good understanding of the basic concept. Your definition is accurate and mentions key points about code reusability. However, you could improve by mentioning function parameters, return values, and specific examples of how functions improve code maintainability. Include practical examples like calculating totals or formatting strings.",
              strengths: ["Clear and concise definition", "Correctly identifies code reusability benefit", "Good emphasis on organization", "Well-structured response"],
              improvements: ["Add explanation of function parameters and arguments", "Provide concrete Python code examples", "Discuss return values and function scope", "Mention best practices for function naming and documentation"]
            })},
          ],
        },
      ],
    });

    export const GenerateAssignmentsAiModel = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Generate exactly 1 comprehensive assignment for a course on Python covering Variables, Functions, and Data Structures. The assignment should have title, description, totalPoints (100), rubric, and dueDate. Return JSON array format with exactly 1 assignment."},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n[\n  {\n    \"title\": \"Python Fundamentals Comprehensive Project\",\n    \"description\": \"Create a Python program that demonstrates mastery of course fundamentals. Your project should: 1) Declare and use different variable types (int, float, string, boolean) with type conversions. 2) Implement at least 3 functions with proper documentation, parameters, and return values. 3) Work with lists, dictionaries, and sets including operations like sorting, filtering, and searching. Include a main() function that calls and demonstrates all components.\",\n    \"totalPoints\": 100,\n    \"rubric\": {\n      \"variable_usage\": 25,\n      \"function_implementation\": 30,\n      \"data_structures\": 30,\n      \"code_quality\": 15\n    },\n    \"dueDate\": \"2025-12-27\"\n  }\n]\n```"},
          ],
        },
      ],
    });

    export const GenerateMCQAiModel = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Generate 20 multiple choice questions (MCQ) on topic: Python Fundamentals, Variables, Data Types with 4 options each and correct answer. Return in JSON format with array of questions containing: question, options array (4 items), and answer fields."},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n{\n  \"mcqTitle\": \"Python Fundamentals MCQ Quiz\",\n  \"questions\": [\n    {\n      \"question\": \"What is Python?\",\n      \"options\": [\"A snake species\", \"A high-level programming language\", \"A mathematical tool\", \"A web framework\"],\n      \"answer\": \"A high-level programming language\"\n    },\n    {\n      \"question\": \"Which of the following is a valid variable name in Python?\",\n      \"options\": [\"2var\", \"var-name\", \"_var123\", \"var name\"],\n      \"answer\": \"_var123\"\n    },\n    {\n      \"question\": \"What is the correct way to create a list in Python?\",\n      \"options\": [\"list = (1, 2, 3)\", \"list = [1, 2, 3]\", \"list = {1, 2, 3}\", \"list = 1, 2, 3\"],\n      \"answer\": \"list = [1, 2, 3]\"\n    },\n    {\n      \"question\": \"Which data type is immutable in Python?\",\n      \"options\": [\"List\", \"Dictionary\", \"Tuple\", \"Set\"],\n      \"answer\": \"Tuple\"\n    },\n    {\n      \"question\": \"What will be the output of print(type([1, 2, 3]))?\",\n      \"options\": [\"<class 'list'>\", \"list\", \"<class 'array'>\", \"array\"],\n      \"answer\": \"<class 'list'>\"\n    },\n    {\n      \"question\": \"How do you access the first element of a list?\",\n      \"options\": [\"list[1]\", \"list[0]\", \"list.first()\", \"list[first]\"],\n      \"answer\": \"list[0]\"\n    },\n    {\n      \"question\": \"Which keyword is used to create a function in Python?\",\n      \"options\": [\"function\", \"def\", \"define\", \"func\"],\n      \"answer\": \"def\"\n    },\n    {\n      \"question\": \"What is the output of 10 // 3?\",\n      \"options\": [\"3.33\", \"3\", \"4\", \"3.0\"],\n      \"answer\": \"3\"\n    },\n    {\n      \"question\": \"Which of the following is a mutable data type?\",\n      \"options\": [\"String\", \"Tuple\", \"List\", \"Integer\"],\n      \"answer\": \"List\"\n    },\n    {\n      \"question\": \"What does the len() function return?\",\n      \"options\": [\"Length in meters\", \"Number of characters or elements\", \"Last element\", \"Type of variable\"],\n      \"answer\": \"Number of characters or elements\"\n    },\n    {\n      \"question\": \"Which operator is used for exponentiation in Python?\",\n      \"options\": [\"^\", \"**\", \"^\", \"pow\"],\n      \"answer\": \"**\"\n    },\n    {\n      \"question\": \"What is the correct syntax for a dictionary in Python?\",\n      \"options\": [\"dict = {1, 2, 3}\", \"dict = ['key', 'value']\", \"dict = {'key': 'value'}\", \"dict = <key, value>\"],\n      \"answer\": \"dict = {'key': 'value'}\"\n    },\n    {\n      \"question\": \"How do you add an element to a list?\",\n      \"options\": [\"list.add()\", \"list.append()\", \"list.insert()\", \"list.push()\"],\n      \"answer\": \"list.append()\"\n    },\n    {\n      \"question\": \"What will print(3 == '3') output?\",\n      \"options\": [\"True\", \"False\", \"Error\", \"None\"],\n      \"answer\": \"False\"\n    },\n    {\n      \"question\": \"Which of the following is a sequence data type?\",\n      \"options\": [\"Dictionary\", \"Set\", \"String\", \"All of the above\"],\n      \"answer\": \"String\"\n    },\n    {\n      \"question\": \"What is the output of type(3.14)?\",\n      \"options\": [\"<class 'int'>\", \"<class 'float'>\", \"<class 'number'>\", \"<class 'decimal'>\"],\n      \"answer\": \"<class 'float'>\"\n    },\n    {\n      \"question\": \"How do you convert a string to an integer?\",\n      \"options\": [\"toInt()\", \"int()\", \"convert()\", \"parse()\"],\n      \"answer\": \"int()\"\n    },\n    {\n      \"question\": \"What is None in Python?\",\n      \"options\": [\"An error\", \"Absence of value\", \"Empty string\", \"Zero\"],\n      \"answer\": \"Absence of value\"\n    },\n    {\n      \"question\": \"Which method removes the last element from a list?\",\n      \"options\": [\"list.remove()\", \"list.pop()\", \"list.delete()\", \"list.shift()\"],\n      \"answer\": \"list.pop()\"\n    },\n    {\n      \"question\": \"What is the output of bool(0)?\",\n      \"options\": [\"True\", \"False\", \"0\", \"Error\"],\n      \"answer\": \"False\"\n    }\n  ]\n}\n```"},
          ],
        },
      ],
    });
