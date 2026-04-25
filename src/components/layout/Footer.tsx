export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container-xl">
        <p>© {year} CATRACHO</p>
      </div>
    </footer>
  );
}
