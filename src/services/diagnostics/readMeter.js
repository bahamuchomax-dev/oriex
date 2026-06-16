/* ============================================================
 * readMeter — runtime Firestore read counter (opt-in diagnostic)
 * ------------------------------------------------------------
 * WHY: the live app is the frozen legacy bundle, which carries its OWN copy of
 * the Firebase SDK. The modern shell (src/firebase/firebase.js) carries a
 * SEPARATE copy. The two never share a JS module, so there is no single
 * SDK-level hook that sees every read. The ONE place both paths funnel through
 * is the network: every billed read travels to firestore.googleapis.com over
 * WebChannel (experimentalForceLongPolling → XHR; fetch as a fallback).
 *
 * So we count at the transport. For each Firestore response we scan for document
 * resource names:
 *   projects/<p>/databases/<d>/documents/<col>/<id>/<col>/<id>...
 * A DOCUMENT path has an EVEN number of segments after `documents/`
 * (col/id/col/id...); a COLLECTION/query-target path has an ODD count
 * (col, or col/id/col). Counting only even-segment names tallies real documents
 * returned and naturally drops the query-target echoes in the same payload.
 * Repeats across responses ARE counted — that is the point (they are re-reads
 * the cache failed to absorb, i.e. billed reads).
 *
 * This is a BREAKDOWN tool ("which collection is still eating reads"), not an
 * exact billing mirror. Numbers track Firestore's own reporting closely enough
 * to rank offenders, which is what we need while the user count is small.
 *
 * SAFETY: opt-in only (URL flag / localStorage). When off, install() is a no-op
 * and nothing is wrapped. When on, it only OBSERVES — it never alters requests,
 * responses, or app handlers, and never throws into app code.
 *
 * USAGE: open the app with ?oxReadMeter=1 (or run
 *   localStorage.setItem("oxReadMeter","1")  then reload).
 * Then in the console:
 *   __oxReads.table()      // breakdown by collection group
 *   __oxReads.snapshot()   // plain object you can copy out
 *   __oxReads.reset()      // zero the counters (e.g. before opening one screen)
 * ============================================================ */

const FLAG_QUERY = "oxReadMeter";
const FLAG_HASH = "ox-read-meter";
const FLAG_STORAGE = "oxReadMeter";

const FIRESTORE_HOST_RE = /firestore\.googleapis\.com|firestore\.googleapis|\/google\.firestore\./i;

// Document/collection resource names inside any Firestore JSON response.
// Capture group 1 = the path AFTER `.../documents/`.
const RESOURCE_RE =
  /"name"\s*:\s*"projects\/[^/"]+\/databases\/[^/"]+\/documents\/((?:[^"\\]|\\.)+)"/g;

let installed = false;

export function isReadMeterEnabled(location, storage) {
  try {
    const loc = location || (typeof window !== "undefined" ? window.location : null);
    if (loc) {
      const search = String(loc.search || "");
      let byQuery = false;
      try {
        byQuery = new URLSearchParams(search).get(FLAG_QUERY) === "1";
      } catch {
        byQuery = new RegExp("[?&]" + FLAG_QUERY + "=1(?:&|$)").test(search);
      }
      const hash = String(loc.hash || "").replace(/^#/, "");
      if (byQuery || hash === FLAG_HASH) return true;
    }
    const store = storage || (typeof window !== "undefined" ? window.localStorage : null);
    if (store && store.getItem(FLAG_STORAGE) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/* Even segment count after `documents/` ⇒ a document; odd ⇒ collection/target. */
function isDocumentPath(path) {
  const segs = path.split("/");
  return segs.length > 0 && segs.length % 2 === 0;
}

// users/UID/bookLogs/DOCID -> { group:"users/bookLogs", norm:"users/<*>/bookLogs/<*>" }
function classify(path) {
  const segs = path.split("/");
  const cols = [];
  const norm = [];
  for (let i = 0; i < segs.length; i += 1) {
    if (i % 2 === 0) {
      cols.push(segs[i]);
      norm.push(segs[i]);
    } else {
      norm.push("*");
    }
  }
  return { group: cols.join("/"), norm: norm.join("/") };
}

function createCounters() {
  return {
    total: 0,
    requests: 0,
    groups: new Map(), // "users/bookLogs" -> count
    paths: new Map(), // "users/*/bookLogs/*" -> count
    startedAt: Date.now(),
  };
}

function tally(counters, path) {
  if (!isDocumentPath(path)) return;
  const { group, norm } = classify(path);
  counters.total += 1;
  counters.groups.set(group, (counters.groups.get(group) || 0) + 1);
  counters.paths.set(norm, (counters.paths.get(norm) || 0) + 1);
}

/* Scan the new tail of a (possibly growing) response, starting at `fromCursor`
 * (the count of chars already consumed). Returns the new cursor: the END of the
 * last document matched. A document name split across a streaming-chunk boundary
 * stays UNconsumed (cursor sits before it) and is completed on the next scan, so
 * nothing is missed and nothing is counted twice. Counts a request once per scan
 * that finds at least one document. */
function scanInto(counters, fullText, fromCursor) {
  const text = String(fullText || "");
  const cursor = fromCursor || 0;
  if (text.length <= cursor) return cursor;
  const slice = text.slice(cursor);
  RESOURCE_RE.lastIndex = 0;
  let m;
  let found = 0;
  let lastEnd = cursor;
  while ((m = RESOURCE_RE.exec(slice)) !== null) {
    tally(counters, m[1]);
    found += 1;
    lastEnd = cursor + m.index + m[0].length;
  }
  if (found > 0) counters.requests += 1;
  return found > 0 ? lastEnd : cursor;
}

function sortedObject(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
}

function buildApi(counters) {
  return {
    get total() {
      return counters.total;
    },
    get requests() {
      return counters.requests;
    },
    groups() {
      return sortedObject(counters.groups);
    },
    paths() {
      return sortedObject(counters.paths);
    },
    snapshot() {
      return {
        total: counters.total,
        requests: counters.requests,
        sinceMs: Date.now() - counters.startedAt,
        groups: sortedObject(counters.groups),
        paths: sortedObject(counters.paths),
      };
    },
    table() {
      const rows = sortedObject(counters.groups);
      try {
        if (typeof console !== "undefined" && console.table) console.table(rows);
        if (typeof console !== "undefined")
          console.info(
            `[oxReads] ${counters.total} docs across ${counters.requests} responses ` +
              `over ${Math.round((Date.now() - counters.startedAt) / 1000)}s`,
          );
      } catch {
        /* ignore */
      }
      return rows;
    },
    reset() {
      counters.total = 0;
      counters.requests = 0;
      counters.groups.clear();
      counters.paths.clear();
      counters.startedAt = Date.now();
      return true;
    },
  };
}

function wrapXhr(counters, xhrProto) {
  if (!xhrProto || xhrProto.__oxReadMeter) return;
  const origOpen = xhrProto.open;
  const origSend = xhrProto.send;

  xhrProto.open = function open(method, url, ...rest) {
    try {
      this.__oxUrl = String(url || "");
      this.__oxIsFs = FIRESTORE_HOST_RE.test(this.__oxUrl);
    } catch {
      this.__oxIsFs = false;
    }
    return origOpen.call(this, method, url, ...rest);
  };

  xhrProto.send = function send(...args) {
    if (this.__oxIsFs && !this.__oxBound) {
      this.__oxBound = true;
      this.__oxCursor = 0;
      const onChunk = () => {
        try {
          // Only readable as text; binary responseTypes expose no responseText.
          if (this.responseType === "" || this.responseType === "text") {
            this.__oxCursor = scanInto(counters, this.responseText, this.__oxCursor || 0);
          }
        } catch {
          /* ignore */
        }
      };
      try {
        this.addEventListener("progress", onChunk);
        this.addEventListener("loadend", onChunk);
      } catch {
        /* ignore */
      }
    }
    return origSend.apply(this, args);
  };

  xhrProto.__oxReadMeter = true;
}

function wrapFetch(counters, scope) {
  if (!scope || typeof scope.fetch !== "function" || scope.fetch.__oxReadMeter) return;
  const origFetch = scope.fetch.bind(scope);
  const wrapped = function fetch(input, init) {
    let isFs = false;
    try {
      const url = typeof input === "string" ? input : input && input.url;
      isFs = FIRESTORE_HOST_RE.test(String(url || ""));
    } catch {
      isFs = false;
    }
    const p = origFetch(input, init);
    if (!isFs) return p;
    return p.then((res) => {
      try {
        res
          .clone()
          .text()
          .then((text) => {
            try {
              scanInto(counters, text, 0);
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      } catch {
        /* ignore */
      }
      return res;
    });
  };
  wrapped.__oxReadMeter = true;
  scope.fetch = wrapped;
}

/* Install the meter if (and only if) the opt-in flag is present. Idempotent.
 * Returns true when active, false when the flag is off (and nothing is wrapped). */
export function installReadMeter(options = {}) {
  const scope = options.scope || (typeof window !== "undefined" ? window : null);
  if (!scope) return false;
  if (!options.force && !isReadMeterEnabled(options.location, options.storage)) return false;
  if (installed) return true;
  installed = true;

  const counters = createCounters();
  const api = buildApi(counters);

  try {
    if (scope.XMLHttpRequest && scope.XMLHttpRequest.prototype) {
      wrapXhr(counters, scope.XMLHttpRequest.prototype);
    }
  } catch {
    /* ignore */
  }
  try {
    wrapFetch(counters, scope);
  } catch {
    /* ignore */
  }

  try {
    scope.__oxReads = api;
    if (typeof console !== "undefined")
      console.info(
        "[oxReads] Firestore read meter active. Call __oxReads.table() / .snapshot() / .reset().",
      );
  } catch {
    /* ignore */
  }
  return true;
}

/* Test seam: forget that we installed (does not unwrap globals). */
export function __resetReadMeterForTests() {
  installed = false;
}
