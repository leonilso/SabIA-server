import cv2
import numpy as np
import json
import sys
import os
from plyer import notification



BUBBLE_THRESHOLD = 0.6
BUBBLE_RADIUS = 9
INNER_RADIUS = int(BUBBLE_RADIUS * 0.6)

# DEBUG = True

# if DEBUG:
#     cv2.imshow(...)

def transformar_ponto(x, y, M):
    pt = np.array([[[x, y]]], dtype="float32")
    dst = cv2.perspectiveTransform(pt, M)
    return int(dst[0][0][0]), int(dst[0][0][1])


def log_error(msg):
    print(f"PYTHON ERROR: {msg}", file=sys.stderr)


def preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # gray = cv2.equalizeHist(gray)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)

    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31, 5
    )

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    return thresh


def detectar_ancoras(thresh):
    contours, _ = cv2.findContours(
        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    h, w = thresh.shape
    candidatos = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < (h * w) * 0.0006:
            continue

        perimetro = cv2.arcLength(cnt, True)
        if perimetro == 0:
            continue

        # Aproxima o contorno para polígono
        approx = cv2.approxPolyDP(cnt, 0.04 * perimetro, True)

        # 🔴 Âncora precisa ser quadrado → 4 lados
        if len(approx) != 4:
            continue

        # Bounding box
        x, y, bw, bh = cv2.boundingRect(approx)

        # Proporção próxima de 1:1
        ratio = bw / float(bh)
        if ratio < 0.8 or ratio > 1.25:
            continue

        # Ângulos ~90°
        def angulo(a, b, c):
            ba = a - b
            bc = c - b
            cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            return np.degrees(np.arccos(np.clip(cos, -1, 1)))

        pontos = approx.reshape(4, 2)
        angulos = [
            angulo(pontos[i - 1], pontos[i], pontos[(i + 1) % 4])
            for i in range(4)
        ]

        if not all(75 < ang < 105 for ang in angulos):
            continue

        # Centro
        cx = x + bw // 2
        cy = y + bh // 2

        candidatos.append((cx, cy))

    if len(candidatos) < 4:
        raise Exception("Âncoras insuficientes")

    # ============================
    # SEPARAÇÃO POR QUADRANTE
    # ============================
    quadrantes = {"tl": [], "tr": [], "bl": [], "br": []}

    for (cx, cy) in candidatos:
        if cx < w / 2 and cy < h / 2:
            quadrantes["tl"].append((cx, cy))
        elif cx >= w / 2 and cy < h / 2:
            quadrantes["tr"].append((cx, cy))
        elif cx < w / 2 and cy >= h / 2:
            quadrantes["bl"].append((cx, cy))
        else:
            quadrantes["br"].append((cx, cy))

    if any(len(q) == 0 for q in quadrantes.values()):
        raise Exception("Faltando âncoras em algum quadrante")

    def mais_proxima(pontos, ref):
        return min(pontos, key=lambda p: np.hypot(p[0] - ref[0], p[1] - ref[1]))

    tl = mais_proxima(quadrantes["tl"], (0, 0))
    tr = mais_proxima(quadrantes["tr"], (w, 0))
    bl = mais_proxima(quadrantes["bl"], (0, h))
    br = mais_proxima(quadrantes["br"], (w, h))

    debug = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    for (x, y) in [tl, tr, bl, br]:
        cv2.circle(debug, (x, y), 12, (0, 255, 0), 2)

    # largura = 800
    # altura = 600
    # dimensoes = (largura, altura)

    # # Redimensiona a imagem 'debug'
    # debug_resizada = cv2.resize(debug, dimensoes, interpolation=cv2.INTER_AREA)

    # cv2.imshow("Anchors detectadas", debug)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()

    return [tl, tr, bl, br]


# def corrigir_perspectiva(img, anchors):
#     pts1 = np.float32(anchors)
#     w_top = np.linalg.norm(np.array(anchors[1]) - np.array(anchors[0]))
#     w_bot = np.linalg.norm(np.array(anchors[3]) - np.array(anchors[2]))
#     h_left = np.linalg.norm(np.array(anchors[2]) - np.array(anchors[0]))
#     h_right = np.linalg.norm(np.array(anchors[3]) - np.array(anchors[1]))

#     width = int((w_top + w_bot) / 2)
#     height = int((h_left + h_right) / 2)
#     pts2 = np.float32([
#         [0, 0],
#         [width, 0],
#         [0, height],
#         [width, height]
#     ])
#     M = cv2.getPerspectiveTransform(pts1, pts2)
#     return cv2.warpPerspective(img, M, (width, height)), M
def corrigir_perspectiva(img, anchors):
    # Dimensões exatas do PDFKit (A4 em pontos)
    PDF_W = 595
    PDF_H = 842
    
    margem = 20 # A mesma margem 'm' que você usou no Node.js
    size = 30   # O mesmo 'size' da âncora no Node.js
    
    # O centro da âncora é: margem + (tamanho/2)
    offset = margem + (size / 2)
    
    pts1 = np.float32(anchors)
    
    # Mapeamos as âncoras detectadas para as posições reais no PDF
    pts2 = np.float32([
        [offset, offset],                 # tl
        [PDF_W - offset, offset],         # tr
        [offset, PDF_H - offset],         # bl
        [PDF_W - offset, PDF_H - offset]  # br
    ])



    
    M = cv2.getPerspectiveTransform(pts1, pts2)
    # A imagem final terá exatamente o tamanho do PDF (595x842)

    # img_test = cv2.warpPerspective(img, M, (PDF_W, PDF_H))
    # debug = img_test.copy()
    # cores = [(0,0,255), (0,255,0), (255,0,0), (0,255,255)]
    # for (x, y), cor in zip(pts2, cores):
    #     cv2.circle(debug, (int(x), int(y)), 12, cor, 3)

    # cv2.imshow("Anchors reais", debug)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    return cv2.warpPerspective(img, M, (PDF_W, PDF_H)), M



# def bolha_preenchida(thresh, x, y):
#     mask = np.zeros(thresh.shape, dtype="uint8")
#     cv2.circle(mask, (int(x), int(y)), BUBBLE_RADIUS, 255, -1)

#     total = cv2.countNonZero(mask)
#     if total == 0:
#         return False

#     preenchido = cv2.countNonZero(cv2.bitwise_and(thresh, thresh, mask=mask))
#     return (preenchido / total) > BUBBLE_THRESHOLD

def bolha_preenchida(thresh, x, y):
    mask = np.zeros(thresh.shape, dtype="uint8")
    cv2.circle(mask, (int(x), int(y)), INNER_RADIUS, 255, -1)

    pixels = thresh[mask == 255]
    if pixels.size == 0:
        return False

    densidade = np.mean(pixels > 0)
    desvio = np.std(pixels)

    return densidade > 0.5 and desvio < 500


# def bolha_preenchida(thresh, x, y):
#     debug = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
#     cv2.circle(debug, (int(x), int(y)), BUBBLE_RADIUS, (255,0,0), 1)

#     cv2.imshow("Bolha analisada", debug)
#     cv2.waitKey(1)

#     mask = np.zeros(thresh.shape, dtype="uint8")
#     cv2.circle(mask, (int(x), int(y)), BUBBLE_RADIUS, 255, -1)

#     total = cv2.countNonZero(mask)
#     preenchido = cv2.countNonZero(cv2.bitwise_and(thresh, thresh, mask=mask))

#     return (preenchido / total) > BUBBLE_THRESHOLD


def processar(payload):
    image_path = payload["imagePath"]
    questoes = payload["questoes"]

    if not os.path.exists(image_path):
        raise Exception("Imagem não encontrada")

    img = cv2.imread(image_path)
    thresh_pre = preprocess(img)

    # cv2.imshow("Original", img)
    # cv2.imshow("Gray/Thresh", thresh_pre)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()

    anchors = detectar_ancoras(thresh_pre)
    dbg = img.copy()
    for (x, y) in anchors:
        cv2.circle(dbg, (x, y), 15, (0,0,255), 3)

    cv2.imwrite("debug/anchors.png", dbg)
    img_corr, M = corrigir_perspectiva(img, anchors)
    # altura, largura, canais = img_corr.shape
    # img_corr_cent = img_corr.copy()
    # cv2.circle(img_corr_cent, (largura//2, altura//2), 15, (0,0,255), 3)

    # debug = img.copy()
    # cv2.circle(img_corr, (width//2, height//2), 10, (0,255,0), -1)
    # cv2.imwrite("debug/centro.png", debug)

    cv2.imwrite("debug/img_corr.png", img_corr)

    # cv2.imshow("Imagem corrigida", img_corr)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    
    thresh = preprocess(img_corr)
    cv2.imwrite("debug/thresh.png", thresh)

    resultado = {}
    for q in questoes:
        idQuestao = q["idQuestao"]
        tipo = q["tipo"]
        alternativas = q["alternativas"]

        if tipo == "objetiva":
            marcada = None
            debug = img_corr.copy()
            cv2.circle(debug, (400, 550), 10, (0,255,0), -1)
            for alt in alternativas:
                # x_img, y_img = transformar_ponto(alt["x"], alt["y"], M)
                # x_img, y_img = alt["x"], alt["y"]
                # if 0 <= x_img < debug.shape[1] and 0 <= y_img < debug.shape[0]:
                    # notification.notify(
                    #     title='Lembrete Python',
                    #     message=f'{alt["x"]}, {alt["y"]}',
                    #     app_name='Server node',
                    #     timeout=10 # Segundos
                    # )
                                        
                    # cv2.circle(debug, (int(alt["x"]), int(alt["y"])), BUBBLE_RADIUS, (0,0,255), 2)
                #     cv2.imshow(f"DEBUG QUESTAO {numero}", debug)
                #     # cv2.imwrite("debug/debug_posicao_bolhas.png", debug)
                #     cv2.waitKey(0)

                    # cv2.circle(debug, (70, 155), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (70, 177), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (70, 199), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (70, 220), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (x_img, y_img), BUBBLE_RADIUS, (255,0,0), 2)
                if bolha_preenchida(thresh, alt['x'], alt['y']):
                    cv2.circle(debug, (int(alt["x"]), int(alt["y"])), INNER_RADIUS, (0,0,255), 2)
                    # cv2.imshow(f"DEBUG QUESTAO {alt["alternativa"]}", debug)
                    # cv2.waitKey(0)
                    marcada = alt["alternativa"]
                    break
            resultado[idQuestao] = marcada
            # cv2.imshow(f"DEBUG QUESTAO", debug)
            cv2.imwrite("debug/debug_posicao_bolhas.png", debug)
            # cv2.waitKey(0)

        elif tipo == "associativa":
            respostas = {}
            debug = img_corr.copy()
            for alt in alternativas:
                # x_img, y_img = transformar_ponto(alt["x"], alt["y"], M)
                if 0 <= int(alt["x"]) < debug.shape[1] and 0 <= int(alt["y"]) < debug.shape[0]:
                    cv2.circle(debug, (int(alt["x"]), int(alt["y"])), INNER_RADIUS, (0,0,255), 2)
                # #     notification.notify(
                # #     title='Lembrete Python',
                # #     message=f'{alt["x"]}, {alt["y"]}',
                # #     app_name='Server node',
                # #     timeout=10 # Segundos
                # # )   
                #     
                    # cv2.circle(debug, (70, 155), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (70, 177), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (70, 199), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (70, 220), BUBBLE_RADIUS, (0,255,0), 2)
                    # cv2.circle(debug, (x_img, y_img), BUBBLE_RADIUS, (255,0,0), 2)
                if bolha_preenchida(thresh, alt['x'], alt['y']):
                    rep = alt["repeticao"]
                    cv2.circle(debug, (int(alt["x"]), int(alt["y"])), INNER_RADIUS, (0,0,255), 2)
                    respostas[rep] = alt['alternativa']
                    

            resultado[idQuestao] = respostas
            cv2.imwrite("debug/debug_posicao_bolhas.png", debug)
            # cv2.imshow(f"DEBUG QUESTAO", debug)
            # cv2.waitKey(0)
    # cv2.imwrite("debug/debug_posicao_bolhas.png", debug)
    return resultado


if __name__ == "__main__":
    try:
        payload = json.loads(sys.argv[1])
        result = processar(payload)
        print(json.dumps(result))
    except Exception as e:
        log_error(str(e))
        sys.exit(1)
