CREATE DATABASE IF NOT EXISTS SABIA;
USE SABIA;
SET GLOBAL event_scheduler = ON;

-- =====================
-- Usuário
-- =====================
CREATE TABLE Usuario (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    status_assinatura ENUM('ativo', 'inativo', 'cancelado', 'pendente') DEFAULT 'inativo',
    email_verificado BOOLEAN DEFAULT FALSE,
	email_verificacao_token VARCHAR(255),
	email_verificacao_expira DATETIME
);

CREATE TABLE Assinaturas (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    plano_nome VARCHAR(50), -- Ex: 'Trimestral', 'Semestral'
    provas_restantes INT,
    data_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_fim DATETIME NOT NULL,
    external_id VARCHAR(255), -- ID da transação no Stripe, Mercado Pago, etc.
    status VARCHAR(20),
    FOREIGN KEY (usuario_id) REFERENCES Usuario(ID) ON DELETE CASCADE
);

-- =====================
-- Turma
-- =====================
CREATE TABLE Turma (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(36) UNIQUE,
    nome_turma VARCHAR(50),
    ID_usuario INT,
    FOREIGN KEY (ID_usuario)
        REFERENCES Usuario(ID)
        ON DELETE CASCADE
);

-- =====================
-- Projetos
-- =====================
CREATE TABLE Projetos (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    ID_usuario INT NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    ID_turma INT NOT NULL,
    QTD_questoes INT NOT NULL,
    QTD_provas INT NOT NULL,
	questoes_descritivas INT,
    questoes_objetivas INT,
    questoes_associativas INT,
    public_id CHAR(20) UNIQUE,
    status ENUM('rascunho', 'ativo', 'encerrado') DEFAULT 'rascunho',
    data_limite DATETIME NULL,
    FOREIGN KEY (ID_usuario)
        REFERENCES Usuario(ID)
        ON DELETE CASCADE,
    FOREIGN KEY (ID_turma)
        REFERENCES Turma(ID)
        ON DELETE CASCADE
);

-- =====================
-- Tema
-- =====================
CREATE TABLE Tema (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    nome_tematica VARCHAR(100) NOT NULL
);

-- =====================
-- Tema ↔ Projeto
-- =====================
CREATE TABLE Tema_projeto (
    ID_projeto INT NOT NULL,
    ID_tema INT NOT NULL,
    PRIMARY KEY (ID_projeto, ID_tema),
    FOREIGN KEY (ID_projeto)
        REFERENCES Projetos(ID)
        ON DELETE CASCADE,
    FOREIGN KEY (ID_tema)
        REFERENCES Tema(ID)
        ON DELETE CASCADE
);

-- =====================
-- Questões
-- =====================
CREATE TABLE Questoes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(20) UNIQUE,
    ID_resposta_correta INT NULL,
    ID_aluno INT,
    tipo VARCHAR(20),
    enunciado TEXT NOT NULL,
    ID_projeto INT NOT NULL,
    FOREIGN KEY (ID_projeto)
        REFERENCES Projetos(ID)
        ON DELETE CASCADE
);

CREATE TABLE GABARITO (
	ID INT PRIMARY KEY AUTO_INCREMENT,
    ID_projeto INT,
    ID_aluno INT,
	FOREIGN KEY (ID_projeto)
        REFERENCES Projetos(ID)
        ON DELETE CASCADE,
	UNIQUE (ID_projeto, ID_aluno)
);

CREATE TABLE POSICAO_GABARITO (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  ID_gabarito INT NOT NULL,
  ID_questao INT NOT NULL,
  numero_questao INT NOT NULL,
  pagina INT NOT NULL,

  FOREIGN KEY (ID_gabarito) REFERENCES GABARITO(ID) ON DELETE CASCADE,
  FOREIGN KEY (ID_questao) REFERENCES questoes(ID) ON DELETE CASCADE
);

CREATE TABLE POSICAO_ALTERNATIVA (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  ID_posicao_gabarito INT NOT NULL,
  alternativa CHAR(1), -- A B C D
  repeticao TINYINT,    -- 1 2 3 4 (associativas)
  posicao_x DOUBLE,
  posicao_y DOUBLE,
  correta BOOL,
  ID_alternativa INT,

  FOREIGN KEY (ID_posicao_gabarito)
    REFERENCES POSICAO_GABARITO(ID)
    ON DELETE CASCADE,

  UNIQUE (ID_posicao_gabarito, alternativa, repeticao)
);





-- =====================
-- Respostas
-- =====================
CREATE TABLE Respostas (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    ID_questao INT NOT NULL,
    conteudo_resposta TEXT NOT NULL,
    FOREIGN KEY (ID_questao)
        REFERENCES Questoes(ID)
        ON DELETE CASCADE
);

-- 🔴 Evita ciclo (Questão ↔ Resposta)
ALTER TABLE Questoes
ADD CONSTRAINT fk_resposta_correta
FOREIGN KEY (ID_resposta_correta)
REFERENCES Respostas(ID)
ON DELETE SET NULL;

ALTER TABLE POSICAO_ALTERNATIVA
ADD CONSTRAINT fk_id_alternativa
FOREIGN KEY (ID_alternativa)
REFERENCES Respostas(ID)
ON DELETE SET NULL;

-- =====================
-- Aluno
-- =====================
CREATE TABLE Aluno (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    ID_turma INT NOT NULL,
    email VARCHAR(75),
    nome VARCHAR(75),
    FOREIGN KEY (ID_turma)
        REFERENCES Turma(ID)
        ON DELETE CASCADE
);

-- =====================
-- Aluno ↔ Projeto
-- =====================

CREATE TABLE Aluno_projeto (
    ID_aluno INT,
    ID_projeto INT,
    tematica VARCHAR(50),
    questoes_descritivas INT,
    questoes_objetivas INT,
    questoes_associativas INT,
    dica BOOLEAN,
    auxilio_visao BOOLEAN,
    FOREIGN KEY (ID_aluno)
        REFERENCES Aluno(ID)
        ON DELETE CASCADE,
    FOREIGN KEY (ID_projeto)
        REFERENCES Projetos(ID)
        ON DELETE CASCADE
);

CREATE TABLE Respostas_Alunos (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    ID_projeto INT NOT NULL,
    ID_aluno INT NOT NULL,
    ID_questao INT NOT NULL,
    resposta TEXT,
    pagina INT,
    corrigida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ID_questao) REFERENCES Questoes(ID),
    FOREIGN KEY (ID_projeto) REFERENCES Projetos(ID),
    FOREIGN KEY (ID_aluno) REFERENCES ALUNO(ID)
);


ALTER TABLE questoes
ADD CONSTRAINT fk_aluno
	FOREIGN KEY (ID_aluno)
        REFERENCES aluno(ID)
        ON DELETE CASCADE;
        
ALTER TABLE gabarito
ADD CONSTRAINT fk_aluno_gabarito
	FOREIGN KEY (ID_aluno)
        REFERENCES aluno(ID)
        ON DELETE CASCADE;


CREATE TABLE materiais (
  id INT AUTO_INCREMENT PRIMARY KEY,

  public_id CHAR(36) NOT NULL,
  projeto_id INT NOT NULL,

  nome VARCHAR(255) NOT NULL,

  path_arquivo VARCHAR(500) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,

  mime_type VARCHAR(100) NOT NULL,
  tamanho_bytes BIGINT NOT NULL,

  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_materiais_public_id UNIQUE (public_id),

  CONSTRAINT fk_materiais_projeto
    FOREIGN KEY (projeto_id)
    REFERENCES projetos (ID)
    ON DELETE CASCADE
);

DELIMITER $$

CREATE EVENT IF NOT EXISTS atualizar_status_assinatura
ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
DO
BEGIN
    UPDATE Usuario u
    JOIN Assinaturas a ON a.usuario_id = u.ID
    SET u.status_assinatura = 'inativo'
    WHERE a.data_fim < NOW() AND u.status_assinatura = 'ativo';
END$$

DELIMITER ;