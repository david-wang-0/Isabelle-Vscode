/*  Author:     Makarius

File-system operations (see Pure/General/file.scala)
*/
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cygwin_root = cygwin_root;
exports.cygwin_bash = cygwin_bash;
exports.standard_path = standard_path;
exports.platform_path = platform_path;
exports.read_bytes = read_bytes;
exports.read = read;
exports.read_json = read_json;
exports.read_bytes_sync = read_bytes_sync;
exports.read_sync = read_sync;
exports.read_json_sync = read_json_sync;
const path = __importStar(require("path"));
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const platform = __importStar(require("./platform"));
const library = __importStar(require("./library"));
/* Windows/Cygwin */
function cygwin_root() {
    if (platform.is_windows()) {
        return library.getenv_strict("CYGWIN_ROOT");
    }
    else {
        return "";
    }
}
function cygwin_bash() {
    return cygwin_root() + "\\bin\\bash";
}
/* standard path (Cygwin or Posix) */
function slashes(s) {
    return s.replace(/\\/g, "/");
}
function standard_path(platform_path) {
    if (platform.is_windows()) {
        const backslashes = platform_path.replace(/\//g, "\\");
        const root_pattern = new RegExp(library.escape_regex(cygwin_root()) + "(?:\\\\+|\\z)(.*)", "i");
        const root_match = backslashes.match(root_pattern);
        const drive_pattern = new RegExp("([a-zA-Z]):\\\\*(.*)");
        const drive_match = backslashes.match(drive_pattern);
        if (root_match) {
            const rest = root_match[1];
            return "/" + slashes(rest);
        }
        else if (drive_match) {
            const letter = drive_match[1].toLowerCase();
            const rest = drive_match[2];
            return "/cygdrive/" + letter + (!rest ? "" : "/" + slashes(rest));
        }
        else {
            return slashes(backslashes);
        }
    }
    else {
        return platform_path;
    }
}
/* platform path (Windows or Posix) */
function platform_path(standard_path) {
    var _result = [];
    function result() { return _result.join(""); }
    function clear() { _result = []; }
    function add(s) { _result.push(s); }
    function separator() {
        const n = _result.length;
        if (n > 0 && _result[n - 1] !== path.sep) {
            add(path.sep);
        }
    }
    // check root
    var rest = standard_path;
    const is_root = standard_path.startsWith("/");
    if (platform.is_windows()) {
        const cygdrive_pattern = new RegExp("/cygdrive/([a-zA-Z])($|/.*)");
        const cygdrive_match = standard_path.match(cygdrive_pattern);
        const named_root_pattern = new RegExp("//+([^/]*)(.*)");
        const named_root_match = standard_path.match(named_root_pattern);
        if (cygdrive_match) {
            const drive = cygdrive_match[1].toUpperCase();
            rest = cygdrive_match[2];
            clear();
            add(drive);
            add(":");
            add(path.sep);
        }
        else if (named_root_match) {
            const root = named_root_match[1];
            rest = named_root_match[2];
            clear();
            add(path.sep);
            add(path.sep);
            add(root);
        }
        else if (is_root) {
            clear();
            add(cygwin_root());
        }
    }
    else if (is_root) {
        clear();
        add(path.sep);
    }
    // check rest
    for (const p of rest.split("/")) {
        if (p) {
            separator();
            add(p);
        }
    }
    return result();
}
/* read */
async function read_bytes(path) {
    return (0, promises_1.readFile)(platform_path(path));
}
async function read(path) {
    return read_bytes(path).then(buffer => buffer.toString());
}
async function read_json(path) {
    return read(path).then(JSON.parse);
}
function read_bytes_sync(path) {
    return (0, fs_1.readFileSync)(platform_path(path));
}
function read_sync(path) {
    return read_bytes_sync(path).toString();
}
function read_json_sync(path) {
    return JSON.parse(read_sync(path));
}
//# sourceMappingURL=file.js.map