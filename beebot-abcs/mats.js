// To add a mat, put its image in assets/ and add an entry below.
// Rows and columns describe the image grid; start coordinates are zero-based.
// aspectRatio is image width / height. cellLabels are optional.
const MATS = [
  {
    id: "alphabet",
    name: "ABC's",
    image: "assets/mat.png",
    alt: "Alphabet mat with Bee-Bot start square",
    grid: { rows: 5, cols: 4 },
    aspectRatio: 4 / 5,
    start: { row: 1, col: 1, direction: 0 },
    freePlacement: false,
    instructions: "Build a program by tapping Bee-Bot's arrows. Press GO to run it, drag Bee-Bot back to START to run again, and press X to clear the program. Switching mats clears the program.",
    cellLabels: [
      ["Turn", "A", "B / C", "D / F"],
      ["E", "START", "G / H", "I"],
      ["J / K", "L / M", "O", "N / P"],
      ["Turn", "Q / R", "S / T", "U"],
      ["V / W", "Y", "X / Z", "Turn"],
    ],
  },
  {
    id: "positional-words",
    name: "Positional Words",
    image: "assets/positional-words.jpg",
    alt: "Six-column, four-row landscape mat with a rainbow, trees, river, bridge, animals, flowers, and a fire hydrant",
    grid: { rows: 4, cols: 6 },
    aspectRatio: 6 / 4,
    start: { row: 3, col: 0, direction: 0 },
    freePlacement: true,
    instructions: "Practice positional words: beside, between, above, and below. Drag Bee-Bot to any square, tap its arrows to build a program, then press GO. Press X to clear and return to the bottom-left square. Switching mats clears the program.",
  },
];
