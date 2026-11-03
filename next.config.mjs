/** O app (HTML/JS offline) vive em /public; "/" serve o index.html dele. */
export default {
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/index.html" }] };
  },
};
