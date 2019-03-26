const { tmetas, prune } = require('./types');
const { skolemCheck } = require('./util');

const Env = (vars = {}, tcons = {}) =>
  ({ vars, tcons });

const extendVar = (env, x, t) => {
  const n = Object.create(env.vars);
  n[x] = t;
  return Env(n, env.tcons);
};

const skolemCheckEnv = (sk, env) => {
  const vars = env.vars;
  for (let k in vars) skolemCheck(sk, prune(vars[k]));
};

const tmetasEnv = (env, free = [], tms = []) => {
  const vars = env.vars;
  for (let k in vars) tmetas(prune(vars[k]), free, tms);
  return tms;
};

module.exports = {
  Env,
  extendVar,
  skolemCheckEnv,
  tmetasEnv,
};

