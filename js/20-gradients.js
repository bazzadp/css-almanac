export default function compute() {

let ret = {
	functions: {}, // usage by gradient function
	properties: {}, // usage by property
	twopos: 0,
	hints: 0,
	hardStops: 0
};
let stopCount = [];

const keywords = [
	"aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse",
	"chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkgrey","darkkhaki","darkmagenta",
	"darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkslategrey","darkturquoise","darkviolet",
	"deeppink","deepskyblue","dimgray","dimgrey","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray",
	"green","greenyellow","grey","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral",
	"lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightgrey","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightslategrey",
	"lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen",
	"mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace",
	"olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum",
	"powderblue","purple","rebeccapurple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue",
	"slateblue","slategray","slategrey","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke",
	"yellow","yellowgreen","transparent","currentcolor"
];
const keywordRegex = RegExp(`\\b(?<!\-)(?:${keywords.join("|")})\\b`, "gi");

walkDeclarations(ast, ({property, value}) => {
	for (let gradient of extractFunctionCalls(value, {names: /-gradient$/})) {

		let {name, args} = gradient;
		ret.functions[name] = (ret.functions[name] || 0) + 1;

		let propKey = property.indexOf("--") === 0? "--" : property;
		ret.properties[propKey] = (ret.properties[propKey] || 0) + 1;

		// Light color stop parsing

		// This will fail if we have variables with fallbacks in the args so let's just skip those altogether for now
		if (/\bvar\(|\bcalc\(/.test(args)) {
			continue;
		}

		let stops = args.split(/\s*,\s*/);

		// Remove first arg if it's params and not a color stop
		if (/^(at|to|from)\s|ellipse|circle|(?:farthest|closest)-(?:side|corner)|[\d.]+(deg|grad|rad|turn)/.test(stops[0])) {
			stops.shift();
		}

		// Separate color and position(s)
		stops = stops.map(s => {
			let color = s.match(/#[a-f0-9]+|(?:rgba?|hsla?|color)\((\(.*?\)|.)+?\)/)?.[0];

			if (!color) {
				color = s.match(keywordRegex)?.[0];
			}

			let pos = s.replace(color, "").trim().split(/\s+/);

			return {color, pos};
		});

		stopCount.push(stops.length);

		for (let i=0; i<stops.length; i++) {
			let s = stops[i];

			if (s.pos.length > 1) {
				ret.twopos++;
			}

			let prev = stops[i - 1];

			// Calculate hard stops
			if (s.color && prev) {
				// 1 position which is either 0 or the same as the previous one
				if (s.pos.length === 1 && s.pos === prev.pos || parseFloat(s.pos) === 0) {
					ret.hardStops++;
				}
				// Two positions of which the first is 0 or the same as the last one
				else if (s.pos.length === 2) {
					if (parseFLoat(s.pos[0]) === 0 || prev.pos.length === 2 && s.pos[0] === prev.pos?.[1] || prev.pos.length === 1 && s.pos[0] === s.pos[0]) {
						ret.hardStops++;
					}
				}
			}
			else {
				ret.hints++;
			}
		}
	}
}, {
	properties: /^--|^(?:background(-image)?$|list-style-image|border-image|content)$/
});

// Calculate average and max number of stops
ret.maxStops = Math.max(...stopCount);
ret.avgStops = stopCount.reduce((a, c) => a + c, 0) / stopCount.length;

return ret;

}