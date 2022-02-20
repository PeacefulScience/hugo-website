const { parseHTML } = require("linkedom");
const vm = require('vm');
const fs = require('fs').promises;
const fg = require('fast-glob');
const classes = new Set();

const {mathjax} = require('mathjax-full/js/mathjax.js');
const {TeX} = require('mathjax-full/js/input/tex.js');
const {SVG} = require('mathjax-full/js/output/svg.js');
const {liteAdaptor} = require('mathjax-full/js/adaptors/liteAdaptor.js');
const {RegisterHTMLHandler} = require('mathjax-full/js/handlers/html.js');
const {AllPackages} = require('mathjax-full/js/input/tex/AllPackages.js');
require('mathjax-full/js/util/entities/all.js');

const adaptor = liteAdaptor({fontSize: 16});
RegisterHTMLHandler(adaptor);

const tex = new TeX({inlineMath: [['$', '$'], ['\\(', '\\)']]});
const svg = new SVG({fontCache: "local", exFactor: 0.5});

function parsedom(html) {
    const dom = parseHTML(html);
    dom.context = vm.createContext({
      'window': dom, 
      "document": dom.document, 
      "navigator": dom.navigator,
    });
    return dom;
}

async function dom2html(dom) {
  return dom.document.toString();
}

async function getclasses(dom) {
 for (const elem of dom.document.querySelectorAll("*"))
   elem.classList.forEach(c => classes.add(c));
 return dom;
}

async function runscripts(dom) {
 for (const elem of dom.document.querySelectorAll("script[render]")) 
   vm.runInContext(elem.innerHTML, dom.context);
 return dom;
}

async function remove(dom) {
 for (const elem of dom.document.querySelectorAll("[remove]")) 
   elem.remove();
 return dom;
}

async function render_mathjax(html) {
  const mj = mathjax.document(html, {InputJax: tex, OutputJax: svg});
  mj.render();
  html = adaptor.doctype(mj.document) + "\n" ;
  html += adaptor.outerHTML(adaptor.root(mj.document));
  return html;
}

async function render(html) {
 const dom = parsedom(html);
 
 hasMJ = dom.document.querySelector("[mathjax]");
 
 return runscripts(dom)
   .then(remove)
   .then(getclasses)
   .then(dom2html)
   .then((html) => {
     if (hasMJ) return render_mathjax(html);
     return html;
   })
}

async function renderall(glob) {
  const tasks = [];
  const stream = fg.stream(glob);
  for await (const path of stream) 
    tasks.push(
      fs.readFile(path)
        .then(render)
        .then(fs.writeFile.bind(null, path))
        .catch(e => {console.error(e); throw e;})
    )
  return Promise.all(tasks);
};

let globs = process.argv.slice(2);

globs = globs.length ? globs : 'public/**/*.html';

console.log("RENDERING: ", globs)

renderall(globs)
.then(r => fs.writeFile("layouts/classes.html", [...classes].join('\n')))
