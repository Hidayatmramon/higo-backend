let progress = {
  total: 0,
  current: 0,
  status: 'idle' 
};

module.exports = {
  getProgress: () => progress,
  setProgress: (data) => {
    progress = { ...progress, ...data };
  },
  resetProgress: () => {
    progress = { total: 0, current: 0, status: 'idle' };
  }
};
