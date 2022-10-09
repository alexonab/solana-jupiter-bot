// const ui = require("cliui")({ width: 140 });
// @ts-ignore
import cliui from "cliui";
const ui = cliui({ width: 140 });
// const chalk = require("chalk");
import chalk from "chalk";
// const gradient = require("gradient-string");
// @ts-ignore
import gradient from "gradient-string";

// @ts-ignore
// const package = require("../../../package.json");
const version = "0.1.0.beta";
// const { DISCORD_INVITE_URL } = require("../../constants");
//@ts-ignore

import { DISCORD_INVITE_URL } from "../../constants";

const universeSize = 15;
const color = "white";
const startWarp = 30;
let colorsSet = [
	"#cf4884",
	"#8832b3",
	"#b5b4fa",
	"#cdadff",
	"#6d29c5",
	"#4e21d9",
	"#481ede",
];

const random = (h = 100, l = 1) => Math.floor(Math.random() * (h - l + 1)) + l;

export const intro = async () => {
	try {
		const skipIntro = process.env.SKIP_INTRO === "true" || false;

		if (!skipIntro) {
			ui.div(" ");
			for (let i = 0; i < 200; i++) {
				const speed = i > 50 ? 100 - i : i;
				const a = colorsSet.shift();
				colorsSet.push(a as string);
				const g = gradient(colorsSet);

				const char =
					i > startWarp
						? i > 180
							? g("/").repeat(random(i / 10, i / 10 - 2))
							: "-".repeat(random(i / 10, i / 10 - 2))
						: "•";
				await new Promise((resolve) => setTimeout(resolve, speed));

				console.clear();
				ui.resetOutput();

				for (let ii = 0; ii < universeSize; ii++) {
					ui.div({
						text: `${chalk[color](char)}`,
						padding: [0, 0, 0, random()],
					});
				}

				ui.div(
					{
						// @ts-ignore
						text: g(`ARB SOLANA BOT - ${version}`),
						width: 50,
						align: "center",
						padding: [1, 0, 1, 0],
					},
					{
						text: `Discord: ${chalk.magenta(DISCORD_INVITE_URL)}\n ${chalk.gray(
							"- PRESS [D] TO OPEN -"
						)}`,
						width: 50,
						align: "center",
						padding: [1, 0, 1, 0],
					}
				);

				for (let ii = 0; ii < universeSize; ii++) {
					ui.div({
						text: `${chalk[color](char)}`,
						padding: [0, 0, 0, random()],
					});
				}

				console.log(ui.toString());
			}
			ui.div("");
			console.clear();
		}
	} catch (error) {
		console.log(error);
	}
};
