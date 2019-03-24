const {
  isTFun,
  TFun,
  showTy,
  occursTMeta,
} = require('./types');
const {
  terr,
  freshTMeta,
} = require('./util');

const bindVar = (x, t) => {
  if (x.type) return unify(x.type, t);
  if (t.tag === 'TMeta' && t.type) return unify(x, t.type);
  if (occursTMeta(x, t)) return terr(`${showTy(x)} occurs in ${showTy(t)}`);
  x.type = t;
};
const unify = (a, b) => {
  if (a.tag === 'TVar' || b.tag === 'TVar')
    return terr(`tvar in unify: ${showTy(a)} ~ ${showTy(b)}`);
  if (a === b) return;
  if (a.tag === 'TMeta') return bindVar(a, b);
  if (b.tag === 'TMeta') return bindVar(b, a);
  if (a.tag === 'TApp' && b.tag === 'TApp') {
    unify(a.left, b.left);
    return unify(a.right, b.right);
  }
  if (a.tag === 'TSkol' && b.tag === 'TSkol' && a.id === b.id) return;
  if (a.tag === 'TCon' && b.tag === 'TCon' && a.name === b.name) return;
  return terr(`failed to unify: ${showTy(a)} ~ ${showTy(b)}`);
};

const unifyTFun = ty => {
  if (isTFun(ty)) return ty;
  const fn = TFun(freshTMeta(), freshTMeta());
  unify(ty, fn);
  return fn;
};

module.exports = {
  unify,
  unifyTFun,
};

