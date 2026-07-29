const SOLD = [
  {
    id: "1",
    seller: "Mark",
    title: "Combi H16 Compact voor €16.500",
    when: "2 uur geleden",
    image: "/images/sold/combi-h16.png",
  },
  {
    id: "2",
    seller: "Sandra",
    title: "STILL RX60 voor €22.000",
    when: "3 uur geleden",
    image: "/images/sold/still-rx.png",
  },
  {
    id: "3",
    seller: "Peter",
    title: "Linde H35 voor €19.750",
    when: "4 uur geleden",
    image: "/images/sold/linde-h.png",
  },
  {
    id: "4",
    seller: "Fatima",
    title: "Manitou MH 25-4T voor €24.900",
    when: "5 uur geleden",
    image: "/images/sold/manitou-mh25.png",
  },
  {
    id: "5",
    seller: "Johan",
    title: "Jungheinrich EFG voor €18.200",
    when: "6 uur geleden",
    image: "/images/sold/jungheinrich-efg.png",
  },
];

export function SoldSlider() {
  const items = [...SOLD, ...SOLD];

  return (
    <div className="sold-slider" aria-label="Recent verkochte heftrucks">
      <div className="sold-track">
        {items.map((item, index) => (
          <article className="sold-card" key={`${item.id}-${index}`}>
            <div className="sold-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.title} />
            </div>
            <div className="sold-copy">
              <strong>Verkocht door {item.seller}</strong>
              <span>{item.title}</span>
              <small>{item.when}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
