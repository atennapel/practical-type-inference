const {
  TApp,
  TForall,
} = require('./types');
const {
  showKind,
  pruneKind,
  occursKMeta,
  KFun,
  kType,
} = require('./kinds');
const {
  freshKMeta,
} = require('./util');

const bindKMeta = (env, x, t) => {
  if (x.kind) return unifyKind(env, x.kind, t);
  if (t.tag === 'KMeta' && t.kind) return unifyKind(env, x, t.kind);
  if (occursKMeta(x, t)) return terr(`${showTy(x)} occurs in ${showTy(t)}`);
  x.kind = t;
};
const unifyKind = (a, b) => {
  if (a === b) return;
  if (a.tag === 'KMeta') return bindKMeta(env, a, b);
  if (b.tag === 'KMeta') return bindKMeta(env, b, a);
  if (a.tag === 'KFun' && b.tag === 'KFun') {
    unifyKind(env, a.left, b.left);
    return unifyKind(env, a.right, b.right);
  }
  if (a.tag === 'KCon' && b.tag === 'KCon' && a.name === b.name) return;
  return terr(`failed to unify kinds: ${showKind(a)} ~ ${showKind(b)}`);
};

const inferKindR = (env, t) => {
  if (t.tag === 'TMeta') return [t.kind, t];
  if (t.tag === 'TVar') return terr(`tvar ${t.name} in inferKindR`);
  if (t.tag === 'TSkol') return [t.kind, t];
  if (t.tag === 'TCon') {
    if (!env.tcons[t.name])
      return terr(`undefined type constructor ${showTy(t)}`);
    return [env.tcons[t.name], t];
  }
  if (t.tag === 'TApp') {
    const [l, tl] = inferKindR(env, t.left);
    const [r, tr] = inferKindR(env, t.right);
    const km = freshKMeta();
    unifyKind(l, KFun(r, km));
    return [km, tl === t.left && tr === t.right ? t : TApp(tl, tr)];
  }
  if (t.tag === 'TForall') {
    const { tvs, ks, type } = t;
    const m = {};
    const nks = Array(ks.length);
    for (let i = 0, l = tvs.length; i < l; i++) {
      const ki = ks[i] || freshKMeta();
      const k = freshTSkol(tvs[i], ki);
      m[tvs[i]] = k;
      nks[i] = ki;
    }
    const [km, b] = inferKindR(env, substTVar(m, type));
    return [km, TForall(tvs, nks, b)];
  }
};

const defaultKindInKind = k => {
  if (k.tag === 'KCon') return k;
  if (k.tag === 'KMeta') {
    if (k.kind) return defaultKindInKind(k.kind);
    return kType;
  }
  if (k.tag === 'KFun') {
    const l = defaultKindInKind(k.left);
    const r = defaultKindInKind(k.right);
    return l === k.left && r === k.right ? k : KFun(l, r);
  }
};

const defaultKind = t => {
  if (t.tag === 'TApp') {
    const l = defaultKind(t.left);
    const r = defaultKind(t.right);
    return l === t.left && r === t.right ? t : TApp(l, r);
  }
  if (t.tag === 'TForall') {
    const { tvs, ks, type } = t;
    const nks = ks.map(k => k ? defaultKindInKind(k) : kType);
    const b = defaultKind(type);
    return TForall(tvs, nks, b);
  }
  if (t.tag === 'TMeta')
    return terr(`tmeta ?${t.id} in defaultKind`);
  if (t.tag === 'TSkol')
    return terr(`tskol ${t.name}\$${t.id} in defaultKind`);
  return t;
};

const inferKind = (env, ty) => {
  const ti = inferKindR(env, ty);
  return defaultKind(ti);
};

const kindOf = (env, t) => {
  if (t.tag === 'TMeta') return t.kind;
  if (t.tag === 'TSkol') return t.kind;
  if (t.tag === 'TCon')
    return env.tcons[t.name] || terr(`undefined type constructor ${showTy(t)}`);
  if (t.tag === 'TApp') {
    const f = kindOf(env, t.left);
    if (f.tag !== 'KFun')
      return terr(`not a kind fun in left side of type application (${showTy(t)}): ${showKind(f)}`);
    return f.right;
  }
  if (t.tag === 'TForall') return terr(`tforall ${showTy(t)} in kindOf`);
  if (t.tag === 'TVar') return terr(`tvar ${showTy(t)} in kindOf`);
};

module.exports = {
  inferKind,
  kindOf,
};

