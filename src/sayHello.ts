export const sayHello = (name: string): string => {
  const res = `Hello ${name}!`
  console.log(res);
  return res;
};

sayHello('World');
