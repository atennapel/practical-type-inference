// terms
const Var = name => ({ tag: 'Var', name });
const App = (left, right) => ({ tag: 'App', left, right });
const Abs = (name, body) => ({ tag: 'Abs', name, body });
const Let = (name, val, body) => ({ tag: 'Let', name, val, body });
const Ann = (term, type) => ({ tag: 'Ann', term, type });

const showTerm = term => {
  if (term.tag === 'Var') return term.name;
  if (term.tag === 'Abs') return `(\\${term.name} -> ${showTerm(term.body)})`;
  if (term.tag === 'App') return `(${showTerm(term.left)} ${showTerm(term.right)})`;
  if (term.tag === 'Let') return `(let ${term.name} = ${showTerm(term.val)} in ${showTerm(term.body)})`;
  if (term.tag === 'Ann') return `(${showTerm(term.term)} : ${showTy(term.type)})`;
};

// types
const TCon = name => ({ tag: 'TCon', name });
const TVar = name => ({ tag: 'TVar', name });
const TMeta = (id, type = null) => ({ tag: 'TMeta', id, type });
const TSkol = (name, id) => ({ tag: 'TSkol', name, id });
const TFun = (left, right) => ({ tag: 'TFun', left, right });
const TForall = (tvs, type) => ({ tag: 'TForall', tvs, type });

const showTy = ty => {
  if (ty.tag === 'TCon') return ty.name;
  if (ty.tag === 'TVar') return ty.name;
  if (ty.tag === 'TMeta') return `?${ty.id}`;
  if (ty.tag === 'TSkol') return `${ty.name}\$${ty.id}`;
  if (ty.tag === 'TFun') return `(${showTy(ty.left)} -> ${showTy(ty.right)})`;
  if (ty.tag === 'TForall') return `(forall ${ty.tvs.join(' ')}. ${showTy(ty.type)})`;
};

let _id = 0;
const resetId = () => { _id = 0 };
const freshId = () => _id++;

const freshTMeta = () => TMeta(freshId());
const freshTSkol = name => TSkol(name, freshId());

const prune = ty => {
  if (ty.tag === 'TMeta') {
    if (!ty.type) return ty;
    const t = prune(ty.type);
    ty.type = t;
    return t;
  }
  if (ty.tag === 'TFun') return TFun(prune(ty.left), prune(ty.right));
  if (ty.tag === 'TForall') return TForall(ty.tvs, prune(ty.type));
  return ty;
};

const substTVar = (map, ty) => {
  if (ty.tag === 'TVar') return map[ty.name] || ty;
  if (ty.tag === 'TFun') return TFun(substTVar(map, ty.left), substTVar(map, ty.right));
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
  if (ty.tag === 'TFun')
    return tmetas(ty.right, free, tmetas(ty.left, free, tms));
  if (ty.tag === 'TForall')
    return tmetas(ty.type, free, tms);
  return tms;
};

const binders = (ty, bs = []) => {
  if (ty.tag === 'TFun') return binders(ty.right, binders(ty.left, bs));
  if (ty.tag === 'TForall') {
    for (let i = 0, l = ty.tvs.length; i < l; i++) {
      const x = ty.tvs[i];
      if (bs.indexOf(x) < 0) bs.push(x);
    }
    return binders(ty.type, bs);
  }
  return bs;
};

// unification
const terr = msg => { throw new TypeError(msg) };

const occursTMeta = (x, t) => {
  if (x === t) return true;
  if (t.tag === 'TFun') return occursTMeta(x, t.left) || occursTMeta(x, t.right);
  if (t.tag === 'TForall') return occursTMeta(x, t.type);
  return false;
};

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
  if (a.tag === 'TFun' && b.tag === 'TFun') {
    unify(a.left, b.left);
    return unify(a.right, b.right);
  }
  if (a.tag === 'TSkol' && b.tag === 'TSkol' && a.id === b.id) return;
  if (a.tag === 'TCon' && b.tag === 'TCon' && a.name === b.name) return;
  return terr(`failed to unify: ${showTy(a)} ~ ${showTy(b)}`);
};

const unifyTFun = ty => {
  if (ty.tag === 'TFun') return ty;
  const fn = TFun(freshTMeta(), freshTMeta());
  unify(ty, fn);
  return fn;
};

const instantiate = ty => {
  if (ty.tag !== 'TForall') return ty;
  const m = {};
  for (let i = 0, l = ty.tvs.length; i < l; i++)
    m[ty.tvs[i]] = freshTMeta();
  return substTVar(m, ty.type);
};

const skolemise = (ty, sk = []) => {
  if (ty.tag === 'TForall') {
    const m = {};
    for (let i = 0, l = ty.tvs.length; i < l; i++) {
      const k = freshTSkol(ty.tvs[i]);
      m[ty.tvs[i]] = k;
      sk.push(k);
    }
    return skolemise(substTVar(m, ty.type), sk);
  }
  if (ty.tag === 'TFun') {
    const b = skolemise(ty.right, sk);
    return TFun(ty.left, b);
  }
  return ty;
};

const quantify = (tms, ty) => {
  const used = binders(ty);
  const len = tms.length;
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

// typechecking
const extend = (env, x, t) => {
  const n = Object.create(env);
  n[x] = t;
  return n;
};

const Check = type => ({ tag: 'Check', type });
const Infer = () => ({ tag: 'Infer', type: null });

const checkRho = (env, term, ty) => tcRho(env, term, Check(ty));
const inferRho = (env, term) => {
  const i = Infer();
  tcRho(env, term, i);
  if (!i.type) return terr(`inferRho failed`);
  return i.type;
};

const tcRho = (env, term, ex) => {
  if (term.tag === 'Var') {
    const ty = env[term.name];
    if (!ty) return terr(`undefined var: ${term.name}`);
    return instSigma(ty, ex);
  }
  if (term.tag === 'App') {
    const ty = inferRho(env, term.left);
    const fn = unifyTFun(ty);
    checkSigma(env, term.right, fn.left);
    return instSigma(fn.right, ex);
  }
  if (term.tag === 'Abs') {
    if (ex.tag === 'Check') {
      const fn = unifyTFun(ex.type);
      const nenv = extend(env, term.name, fn.left);
      return checkRho(nenv, term.body, fn.right);
    } else if (ex.tag === 'Infer') {
      const ty = freshTMeta();
      const nenv = extend(env, term.name, ty);
      const bty = inferRho(nenv, term.body);
      return ex.type = TFun(ty, bty);
    }
  }
  if (term.tag === 'Let') {
    const ty = inferSigma(env, term.val);
    const nenv = extend(env, term.name, ty);
    return tcRho(nenv, term.body, ex);
  }
  if (term.tag === 'Ann') {
    checkSigma(env, term.term, term.type);
    return instSigma(term.type, ex);
  }
};

const tmetasEnv = (env, free = [], tms = []) => {
  for (let k in env) tmetas(prune(env[k]), free, tms);
  return tms;
};
const inferSigma = (env, term) => {
  const ty = inferRho(env, term);
  const etms = tmetasEnv(env);
  const tms = tmetas(prune(ty), etms);
  return quantify(tms, ty);
};

const skolemCheck = (sk, ty) => {
  if (ty.tag === 'TSkol' && sk.indexOf(ty) >= 0)
    return terr(`skolem check failed: ${showTy(ty)}`);
  if (ty.tag === 'TFun') {
    skolemCheck(sk, ty.left);
    return skolemCheck(sk, ty.right);
  }
  if (ty.tag === 'TForall')
    return skolemCheck(sk, ty.type);
};
const checkSigma = (env, term, ty) => {
  const sk = [];
  const rho = skolemise(ty, sk);
  checkRho(env, term, rho);
  skolemCheck(sk, prune(ty));
  for (let k in env) skolemCheck(sk, prune(env[k]));
};

const instSigma = (ty, ex) => {
  if (ex.tag === 'Check') return unify(ty, ex.type);
  return ex.type = instantiate(ty);
};

// testing
const tv = TVar;
function tfun() { return Array.prototype.slice.call(arguments).reduceRight((x, y) => TFun(y, x)) }

const v = Var;
function app() { return Array.prototype.slice.call(arguments).reduce(App) }
const abs = (ns, body) => ns.reduceRight((x, y) => Abs(y, x), body);

const env = {};
const term = Ann(abs(['x'], v('x')), TForall(['t'], tfun(tv('t'), tv('t'))));
try {
  console.log(showTerm(term));
  let time = Date.now();
  const ty = inferSigma(env, term);
  time = Date.now() - time;
  console.log(showTy(ty));
  console.log(`${time}`);
} catch (err) {
  console.log(`${err}`);
}
