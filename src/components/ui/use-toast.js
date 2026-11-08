export const toast = (options) => {
  if (typeof window !== 'undefined') {
    if (typeof options === 'string') alert(options);
    else if (options?.description) alert(options.description);
    else if (options?.title) alert(options.title);
  }
};
