export const EVENTS = [
  {
    id: 101,
    name: "Festival Planeta Brasil",
    venue: "Estádio Mané Garrincha · Brasília",
    date: "12 set 2026",
    cap: 50,
    faceValue: 320,
    maxResale: 480,
    royaltyBP: 800,
    org: "Planeta Produções",
    orgWallet: "0xPLAN…eta1",
    grad: "linear-gradient(135deg,#7C5CFF,#FF4D6D)",
  },
  {
    id: 102,
    name: "Alok — Future Rave",
    venue: "Allianz Parque · São Paulo",
    date: "03 out 2026",
    cap: 50,
    faceValue: 250,
    maxResale: 300,
    royaltyBP: 1000,
    org: "Bash Eventos",
    orgWallet: "0xBASH…ev02",
    grad: "linear-gradient(135deg,#1FC7A8,#5436D6)",
  },
  {
    id: 103,
    name: "Samba na Lapa",
    venue: "Circo Voador · Rio de Janeiro",
    date: "20 set 2026",
    cap: 50,
    faceValue: 90,
    maxResale: 110,
    royaltyBP: 500,
    org: "Lapa Cultural",
    orgWallet: "0xLAPA…cv03",
    grad: "linear-gradient(135deg,#F4C152,#FF4D6D)",
  },
];

let TID = 5000;
export const nextId = () => ++TID;
