const tmi = require("tmi.js");
const axios = require("axios");
const { splice } = require("../utils");
const { EMOTES, ENDPOINTS } = require("../constants");

const client = new tmi.Client({
	identity: {
		username: process.env.BOT_USERNAME,
		password: process.env.OAUTH_TOKEN,
	},
	channels: [process.env.CHANNEL_NAME],
});

function formatChat(event) {
	var {
		message,
		user,
		state: { id, badges, emotes, color },
	} = event;

	if (badges) {
		var badgeML = Object.entries(badges)
			.map(([b, k]) => {
				return `<img src="${BADGES.find((x) => x.set_id == b).versions.find((x) => x.id == k).image_url_1x}" class="badge" />`;
			})
			.join("\n");
	} else badgeML = "";

	var textML = message;
	if (emotes) {
		for (var [k, v] of Object.entries(emotes)) {
			console.log(k, v);
			for (var a of v) {
				var split = a.split("-");
				var s = parseInt(split[0]);
				var e = parseInt(split[1]);
				textML = splice(
					textML,
					s,
					e,
					`<img src="${EMOTES.replace(":id", k).replace("2.0", "1.0")}" class="emoji" />`,
				);
			}
		}
	}

	var userML =
		`<span style="color: ${color}"><strong>` + user + `</strong></span>`;

	return {
		id,
		badgeML,
		textML,
		userML,
	};
}

function formatEmote(event) {
	const { emote, state } = event;

	return {
		id: state.id,
		src: EMOTES.replace(":id", emote),
	};
}

var BADGES;
module.exports = async function setup(app, evtClients, TOKEN) {
	client.connect();

	let req = await axios.get(`${ENDPOINTS.BASE()}/${ENDPOINTS.GET_BADGES()}`, {
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			"Client-Id": process.env.CLIENT_ID,
		},
	});
	BADGES = req.data.data;

	// client.on('message', (channel, tags, message, self) => {
	// 	console.log(message, self)
	// 	if(self) return;

	// 	for(var c of Object.values(evtClients)) {
	// 		c.write(`event: message\n`);
	// 		c.write(`data: ${JSON.stringify({ message })}\n\n`);
	// 	}
	// })

	client.on("message", (channel, state, message, self) => {
		if (self) return;

		// console.log(message, state);
		var evt, data;
		if (!state["emote-only"] && state["message-type"] == "chat") {
			evt = "message";
			data = formatChat({
				message,
				user: state.username,
				state,
			});
		} else if (state["emote-only"]) {
			evt = "emote";
			data = formatEmote({
				emote: Object.keys(state.emotes)[0],
				state,
			});
		}

		for (var c of Object.values(evtClients)) {
			c.write(`event: ${evt}\n`);
			c.write(`data: ${JSON.stringify(data)}\n\n`);
		}
	});
};
