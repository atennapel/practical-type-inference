const TCon = name => ({ tag: 'TCon', name });
const TVar = name => ({ tag: 'TVar', name });
const TMeta = (id, type = null) => ({ tag: 'TMeta', id, type });
const TSkol = (name, id) => ({ tag: 'TSkol', name, id });
const TApp = (left, right) => ({ tag: 'TApp', left, right });
const TForall = (tvs, type) => ({ tag: 'TForall', tvs, type });

const tFun = TCon('->');
const TFun = (left, right) => TApp(TApp(tFun, left), right);
const isTFun = ty =>
  ty.tag === 'TApp' && ty.left.tag === 'TApp' &&
    (ty.left.left === tFun || (ty.left.left.tag === 'TCon' && ty.left.left.name === tFun.name));

const showTy = ty => {
  if (ty.tag === 'TCon') return ty.name;
  if (ty.tag === 'TVar') return ty.name;
  if (ty.tag === 'TMeta') return `?${ty.id}`;
  if (ty.tag === 'TSkol') return `${ty.name}\$${ty.id}`;
  if (ty.tag === 'TForall') return `(forall ${ty.tvs.join(' ')}. ${showTy(ty.type)})`;
  if (isTFun(ty)) return `(${showTy(ty.left.right)} -> ${showTy(ty.right)})`;
  if (ty.tag === 'TApp') return `(${showTy(ty.left)} ${showTy(ty.right)})`;
};

const substTVar = (map, ty) => {
  if (ty.tag === 'TVar') return map[ty.name] || ty;
  if (ty.tag === 'TApp') return TApp(substTVar(map, ty.left), substTVar(map, ty.right));
  if (ty.tag === 'TForall') {
    const m = {};
    for (let k in map) if (ty.tvs.indexOf(k) < 0) m[k] = map[k];
    return TForall(ty.tvs, substTVar(m, ty.type));
  }
  return ty;
};

const tmetas = (ty, free = [], tms = []) => {
  if (ty.tag === 'TMeta') {
    if (free.indexOf(ty) >= 0 || tms.indexOf(ty) >= 0) return tms;
    tms.push(ty);
    return tms;
  }
  if (ty.tag === 'TApp')
    return tmetas(ty.right, free, tmetas(ty.left, free, tms));
  if (ty.tag === 'TForall')
    return tmetas(ty.type, free, tms);
  return tms;
};

const tbinders = (ty, bs = []) => {
  if (ty.tag === 'TApp') return tbinders(ty.right, tbinders(ty.left, bs));
  if (ty.tag === 'TForall') {
    for (let i = 0, l = ty.tvs.length; i < l; i++) {
      const x = ty.tvs[i];
      if (bs.indexOf(x) < 0) bs.push(x);
    }
    return tbinders(ty.type, bs);
  }
  return bs;
};

const prune = ty => {
  if (ty.tag === 'TMeta') {
    if (!ty.type) return ty;
    const t = prune(ty.type);
    ty.type = t;
    return t;
  }
  if (ty.tag === 'TApp') return TApp(prune(ty.left), prune(ty.right));
  if (ty.tag === 'TForall') return TForall(ty.tvs, prune(ty.type));
  return ty;
};

const occursTMeta = (x, t) => {
  if (x === t) return true;
  if (t.tag === 'TApp') return occursTMeta(x, t.left) || occursTMeta(x, t.right);
  if (t.tag === 'TForall') return occursTMeta(x, t.type);
  return false;
};

const quantify = (tms, ty) => {
  const len = tms.length;
  if (len === 0) return ty;
  const used = tbinders(ty);
  const tvs = Array(len);
  let i = 0;
  let l = 0;
  let j = 0;
  while (i < len) {
    const v = `${String.fromCharCode(l + 97)}${j > 0 ? j : ''}`;
    if (used.indexOf(v) < 0) {
      tms[i].type = TVar(v);
      tvs[i++] = v;
    }
    l = (l + 1) % 26;
    if (l === 0) j++;
  }
  return TForall(tvs, prune(ty));
};

module.exports = {
  TCon,
  TVar,
  TMeta,
  TSkol,
  TFun,
  TForall,
  showTy,

  tFun,
  TFun,
  isTFun,

  substTVar,
  tmetas,
  tbinders,
  prune,
  occursTMeta,
  quantify,
};

