export const getAuthHeaderWithBtoa = (user: string, password: string) => ({
  "Authorization": `Basic ${btoa(`${user}:${password}`)}`,
});
