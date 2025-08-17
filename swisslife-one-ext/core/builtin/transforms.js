// Transformations pré-compilées pour éviter l'eval
window.SwissLifeBuiltinTransforms = {
  
  extractDepartment: (value) => (value || '').slice(0, 2),
  
  arrayLength: (value) => Array.isArray(value) ? value.length : 0,
  
  generateEffectDate: () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(nextMonth.getDate())}/${pad(nextMonth.getMonth() + 1)}/${nextMonth.getFullYear()}`;
  }
};