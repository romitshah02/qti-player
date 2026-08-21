//#region src/utils/test-xml-parser.ts
function e(e) {
	let t = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(e.trim());
	if (!t || !t[1] && !t[2] && !t[3]) return null;
	let n = parseFloat(t[1] || "0"), r = parseFloat(t[2] || "0"), i = parseFloat(t[3] || "0");
	return Math.round(n * 3600 + r * 60 + i);
}
function t(t) {
	let n = Array.from(t.children).find((e) => e.tagName === "qti-time-limits");
	if (!n) return null;
	let r = n.getAttribute("max-time");
	return {
		maxSeconds: r ? e(r) : null,
		allowLateSubmission: n.getAttribute("allow-late-submission") === "true"
	};
}
function n(e) {
	let t = Array.from(e.children).find((e) => e.tagName === "qti-item-session-control");
	if (!t) return null;
	let n = t.getAttribute("max-attempts");
	if (n === null) return null;
	let r = parseInt(n, 10);
	return Number.isNaN(r) ? null : r;
}
function r(e) {
	return {
		identifier: e.getAttribute("identifier"),
		href: e.getAttribute("href"),
		timeLimits: t(e)
	};
}
function i(e) {
	let n = [], i = [];
	for (let t of Array.from(e.children)) t.tagName === "qti-assessment-item-ref" ? n.push(r(t)) : t.tagName === "qti-rubric-block" && i.push((t.textContent || "").trim());
	return {
		identifier: e.getAttribute("identifier"),
		title: e.getAttribute("title") || e.getAttribute("identifier"),
		itemRefs: n,
		rubricBlockText: i.join(" "),
		timeLimits: t(e)
	};
}
function a(e) {
	let r = Array.from(e.children).filter((e) => e.tagName === "qti-assessment-section").map(i);
	return {
		identifier: e.getAttribute("identifier"),
		submissionMode: e.getAttribute("submission-mode") || "individual",
		sections: r,
		timeLimits: t(e),
		maxAttempts: n(e)
	};
}
function o(e) {
	let n = new DOMParser().parseFromString(e, "application/xml"), r = n.querySelector("parsererror");
	if (r) throw Error(`[TestXmlParser] Failed to parse test XML: ${r.textContent}`);
	let i = n.documentElement, o = Array.from(i.children).filter((e) => e.tagName === "qti-test-part").map(a);
	return {
		title: i.getAttribute("title") || "",
		parts: o,
		timeLimits: t(i)
	};
}
function s(e) {
	let t = [];
	for (let n of e.parts) for (let e of n.sections) t.push({
		identifier: e.identifier,
		name: e.title,
		blurb: e.rubricBlockText,
		itemIdentifiers: e.itemRefs.map((e) => e.identifier),
		timeLimitSeconds: e.timeLimits?.maxSeconds ?? null,
		allowLateSubmission: e.timeLimits?.allowLateSubmission ?? !1
	});
	return t;
}
function c(e) {
	let t = [];
	for (let n of e.parts) for (let e of n.sections) t.push(...e.itemRefs);
	return t;
}
//#endregion
//#region src/utils/asset-url-rewriter.ts
function l(e) {
	return /^([a-z][a-z0-9+.-]*:|\/\/|\/|data:)/i.test(e);
}
function u(e, t) {
	return e.replace(/\b(src|href|data)=(["'])(.*?)\2/g, (e, n, r, i) => !i || l(i) ? e : `${n}=${r}${new URL(i, t).toString()}${r}`);
}
//#endregion
//#region src/services/longsight-interaction-compat.ts
var d = [
	"qti-hotspot-interaction",
	"qti-graphic-order-interaction",
	"qti-graphic-associate-interaction",
	"qti-graphic-gap-match-interaction"
];
function f(e) {
	let t = e;
	for (let e of d) {
		let n = RegExp(`(<${e}\\b[^>]*>)([\\s\\S]*?)(</${e}>)`, "g");
		t = t.replace(n, (e, t, n, r) => t + n.replace(/<img\b([^>]*?)\/?>/g, "<object$1></object>") + r);
	}
	return t;
}
function p(e, t) {
	let n = e.match(RegExp(`\\b${t}=["']([^"']*)["']`));
	return n ? n[1] : null;
}
function m(e, t) {
	return t === null ? "" : ` ${e}="${t}"`;
}
function h(e) {
	let t = e;
	for (let e of d) {
		let n = RegExp(`(<${e}\\b[^>]*>)([\\s\\S]*?)(</${e}>)`, "g");
		t = t.replace(n, (e, t, n, r) => t + n.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/g, (e, t) => {
			let n = t.match(/<img\b[^>]*\/?>/);
			if (!n) return e;
			let r = n[0], i = p(r, "src"), a = p(r, "alt"), o = p(r, "width"), s = p(r, "height");
			return `<object${m("src", i)}${m("alt", a)}${m("width", o)}${m("height", s)}></object>`;
		}) + r);
	}
	return t;
}
var g = [
	"qti-gap-match-interaction",
	"qti-graphic-gap-match-interaction",
	"qti-hottext-interaction"
], _ = ["blockquote"];
function v(e) {
	let t = e;
	for (let e of g) {
		let n = RegExp(`(<${e}\\b[^>]*>)([\\s\\S]*?)(</${e}>)`, "g");
		t = t.replace(n, (e, t, n, r) => {
			let i = n;
			for (let e of _) {
				let t = RegExp(`<${e}\\b([^>]*)>([\\s\\S]*?)</${e}>`, "g");
				i = i.replace(t, (t, n, r) => `<div><${e}${n}>${r}</${e}></div>`);
			}
			return t + i + r;
		});
	}
	return t;
}
//#endregion
//#region src/services/content-loader.ts
var y = class {
	previewUrl;
	stimulusCache = /* @__PURE__ */ new Map();
	constructor(e) {
		this.previewUrl = e;
	}
	resolveUrl(e) {
		return `${(this.previewUrl || "").replace(/\/$/, "")}/${e.replace(/^\//, "")}`;
	}
	async fetchText(e) {
		let t = this.resolveUrl(e), n = await fetch(t);
		if (!n.ok) throw Error(`[ContentLoader] Failed to fetch ${t}: ${n.status}`);
		return n.text();
	}
	async getStimulusXml(e) {
		if (this.stimulusCache.has(e.identifier)) return this.stimulusCache.get(e.identifier);
		let t = u(await this.fetchText(e.href), this.resolveUrl(e.href));
		return this.stimulusCache.set(e.identifier, t), t;
	}
	async getStimulusXmlList(e, t) {
		let n = e.stimulusRefs || [], r = [];
		for (let i of n) {
			let n = (t || []).find((e) => e.identifier === i);
			if (!n) {
				console.warn(`[ContentLoader] Item "${e.identifier}" references stimulus "${i}" not found in stimulusList`);
				continue;
			}
			let a = await this.getStimulusXml(n);
			r.push({
				identifier: i,
				xml: a
			});
		}
		return r;
	}
	async resolveItemXml(e) {
		let t = e.xml;
		if (t === void 0) {
			if (!e.href) throw Error(`[ContentLoader] Item "${e.identifier}" has neither xml nor href`);
			t = await this.fetchText(e.href), t = u(t, this.resolveUrl(e.href));
		}
		return v(f(h(t)));
	}
};
//#endregion
//#region src/config/build-runner-config.ts
async function b(e, t) {
	let n = t.stimulusList || [], r = new Map((t.itemList || []).map((e) => [e.identifier, e])), i = (t.testList || [])[0];
	if (!i) return {
		title: t.name || e,
		submissionMode: "simultaneous",
		previewUrl: t.previewUrl,
		stimulusList: n,
		sessionControl: { show_feedback: !0 },
		items: (t.itemList || []).map((e) => ({
			identifier: e.identifier,
			guid: e.identifier,
			href: e.href,
			stimulusRefs: e.stimulusRefs || []
		}))
	};
	let a = o(await new y(t.previewUrl).fetchText(i.href)), l = c(a), u = t.timeLimits?.max ?? a.timeLimits?.maxSeconds ?? void 0, d = t.maxAttempts ?? a.parts[0]?.maxAttempts ?? void 0;
	return {
		title: a.title || t.name || e,
		submissionMode: a.parts[0]?.submissionMode || "simultaneous",
		previewUrl: t.previewUrl,
		stimulusList: n,
		timeLimitSeconds: u,
		sessionControl: {
			show_feedback: !0,
			...d != null && { max_attempts: d }
		},
		sections: s(a).map((e) => ({
			identifier: e.identifier,
			name: e.name,
			blurb: e.blurb,
			itemIdentifiers: e.itemIdentifiers,
			timeLimitSeconds: e.timeLimitSeconds ?? void 0,
			allowLateSubmission: e.allowLateSubmission
		})),
		items: l.map((e) => {
			let t = r.get(e.identifier);
			return {
				identifier: e.identifier,
				guid: e.identifier,
				href: e.href || t?.href,
				stimulusRefs: t?.stimulusRefs || []
			};
		})
	};
}
//#endregion
export { b as buildRunnerConfig, c as flattenItemRefs, s as flattenSections, o as parseAssessmentTest, e as parseIso8601Duration };
