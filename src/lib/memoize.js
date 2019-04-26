export default (fn, mem = {}) => key => (key in mem ? mem[key] : (mem[key] = fn(key)));
