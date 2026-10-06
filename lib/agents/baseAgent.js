const state = require('../state');

class BaseAgent {
  constructor(id, name, role) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.status = 'OBSERVING'; // 'OBSERVING', 'DELIBERATING', 'ACTING', 'ALERT', 'IDLE'
    this.lastThought = '';
    this.lastAction = '';
    this.memory = [];
  }

  setThought(thought) {
    this.lastThought = thought;
    if (state.agents[this.id]) {
      state.agents[this.id].lastThought = thought;
      state.agents[this.id].status = this.status;
      state.agents[this.id].lastUpdated = Date.now();
    }
  }

  setAction(action) {
    this.lastAction = action;
    if (state.agents[this.id]) {
      state.agents[this.id].lastAction = action;
      state.agents[this.id].status = this.status;
      state.agents[this.id].lastUpdated = Date.now();
    }
  }

  setStatus(status) {
    this.status = status;
    if (state.agents[this.id]) {
      state.agents[this.id].status = status;
    }
  }

  log(type, badge, message) {
    return state.addLog(this.name, type, badge, message);
  }

  remember(item) {
    this.memory.push({ timestamp: Date.now(), item });
    if (this.memory.length > 20) this.memory.shift();
  }
}

module.exports = BaseAgent;
