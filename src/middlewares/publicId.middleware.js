// middleware.js
import { db }  from "../config/database.js";

class MapPublicId {
    static async projetos(id) {
        const publicId = id;
        if (!publicId) return console.error("not found");

        const [rows] = await db.execute(
            "SELECT id FROM PROJETOS WHERE public_id = ?",
            [publicId]
        );

        if (!rows.length) return console.error("not found");

        return rows[0].id
    }
    static async aluno(id) {
        const publicId = id;
        if (!publicId) return console.error("not found");

        const [rows] = await db.execute(
            "SELECT id FROM ALUNO WHERE public_id = ?",
            [publicId]
        );

        if (!rows.length) return console.error("not found");

        return rows[0].id
    }
    static async turma(id) {
        const publicId = id;
        if (!publicId) return console.error("not found");

        const [rows] = await db.execute(
            "SELECT id FROM TURMA WHERE public_id = ?",
            [publicId]
        );

        if (!rows.length) return console.error("not found");

        return rows[0].id
    }
    static async usuario(id) {
        const publicId = id;
        if (!publicId) return console.error("not found");

        const [rows] = await db.execute(
            "SELECT id FROM USUARIO WHERE public_id = ?",
            [publicId]
        );

        if (!rows.length) return console.error("not found");

        return rows[0].id
    }
    static async questoes(id) {
        const publicId = id;
        if (!publicId) return console.error("not found");

        const [rows] = await db.execute(
            "SELECT id FROM QUESTOES WHERE public_id = ?",
            [publicId]
        );

        if (!rows.length) return console.error("not found");

        return rows[0].id
    }
}

export default MapPublicId


