import React, { useEffect, useState } from "react";

export default function Libros() {
  const [libros, setLibros] = useState([]);
  const [selectedLibro, setSelectedLibro] = useState(null);

  useEffect(() => {
    async function fetchLibros() {
      // Aquí pon tu CSV de Google Sheets
      const res = await fetch(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv"
      );
      const text = await res.text();

      // Convertimos CSV a objetos:
      const rows = text.split("\n").map(r => r.split(","));
      const headers = rows[0];
      const data = rows.slice(1).map(r =>
        headers.reduce((acc, header, i) => {
          acc[header.trim()] = r[i] ? r[i].trim() : "";
          return acc;
        }, {})
      );

      // Orden alfabético por Título
      const ordenados = data.sort((a, b) =>
        a.Título.localeCompare(b.Título, "es", { sensitivity: "base" })
      );
      setLibros(ordenados);
    }

    fetchLibros();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
        📚 Lista de Libros
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {libros.map((libro, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedLibro(libro)}
            className="cursor-pointer bg-white shadow-lg rounded-2xl p-4 hover:bg-indigo-50 transition"
          >
            <h2 className="text-xl font-semibold text-indigo-800">{libro.Título}</h2>
            <p className="text-sm text-gray-600">{libro.Autor}</p>
            <span className="inline-block mt-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
              {libro.Género}
            </span>
          </div>
        ))}
      </div>

      {selectedLibro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedLibro(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✖
            </button>

            <h2 className="text-2xl font-bold text-indigo-700 mb-4">
              {selectedLibro.Título}
            </h2>

            <div className="space-y-2 text-gray-700">
              <p><strong>Autor:</strong> {selectedLibro.Autor}</p>
              <p><strong>Género:</strong> {selectedLibro.Género}</p>
              <p><strong>Tono:</strong> {selectedLibro.Tono}</p>
              <p
