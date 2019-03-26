const KCon = name => ({ tag: 'KCon', name });
const KFun = (left, right) => ({ tag: 'KFun', left, right });
const KMeta = (id, kind = null) => ({ tag: 'KMeta', id, kind });

const kType = KCon('Type');

const showKind = ki => {
  if (ki.tag === 'KCon') return ki.name;
  if (ki.tag === 'KMeta') return `?${ki.id}`;
  if (ki.tag === 'KFun') return `(${showKind(ki.left)} -> ${showKind(ki.right)})`;
};

const pruneKind = ki => {
  if (ki.tag === 'TMeta') {
    if (!ki.kind) return ki;
    const k = pruneKind(ki.kind);
    ki.kind = k;
    return k;
  }
  if (ki.tag === 'KFun') return KFun(pruneKind(ki.left), pruneKind(ki.right));
  return ki;
};

const occursKMeta = (x, k) => {
  if (x === k) return true;
  if (k.tag === 'KFun') return occursKMeta(x, k.left) || occursKMeta(x, k.right);
  return false;
};

const eqKind = (a, b) => {
  if (a === b) return true;
  if (a.tag === 'KCon')
    return b.tag === 'KCon' && a.name === b.name;
  if (a.tag === 'KFun') 
    return b.tag === 'KFun' && eqKind(a.left, b.left) && eqKind(a.right, b.right);
  return false;
};

module.exports = {
  KCon,
  KFun,
  KMeta,
  kType,
  showKind,
  pruneKind,
  occursKMeta,
  eqKind,
};
