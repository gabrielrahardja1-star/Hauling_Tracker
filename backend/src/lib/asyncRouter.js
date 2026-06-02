export function wrapAsyncRoutes(router) {
  for (const method of ['get', 'post', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => original(
      path,
      ...handlers.map((handler) => {
        if (handler.constructor.name !== 'AsyncFunction') return handler;
        return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
      })
    );
  }
  return router;
}
