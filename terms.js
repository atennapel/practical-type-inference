const { showTy } = require('./types');

const Var = name => ({ tag: 'Var', name });
const Lit = val => ({ tag: 'Lit', val });
const App = (left, right) => ({ tag: 'App', left, right });
const Abs = (name, body) => ({ tag: 'Abs', name, body });
const AbsT = (name, type, body) => ({ tag: 'AbsT', name, type, body });
const Let = (name, val, body) => ({ tag: 'Let', name, val, body });
const Ann = (term, type) => ({ tag: 'Ann', term, type });

const showTerm = term => {
  if (term.tag === 'Var') return term.name;
  if (term.tag === 'Lit') return `${term.val}`;
  if (term.tag === 'Abs') return `(\\${term.name} -> ${showTerm(term.body)})`;
  if (term.tag === 'AbsT')
    return `(\\(${term.name} : ${showTy(term.type)}) -> ${showTerm(term.body)})`;
  if (term.tag === 'App') return `(${showTerm(term.left)} ${showTerm(term.right)})`;
  if (term.tag === 'Let')
    return `(let ${term.name} = ${showTerm(term.val)} in ${showTerm(term.body)})`;
  if (term.tag === 'Ann') return `(${showTerm(term.term)} : ${showTy(term.type)})`;
};

module.exports = {
  Var,
  Lit,
  App,
  Abs,
  AbsT,
  Let,
  Ann,
  showTerm,
};

