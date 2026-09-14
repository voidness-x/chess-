let scaler = 2
let w = 22 * scaler
let board_w = 8 * w
let offset = 0

let colors = { WHITE: 1, BLACK: -1 }
let pieces = { PAWN: 1, ROOK: 2, KNIGHT: 3, BISHOP: 4, QUEEN: 5, KING: 6 }  //unused yet

//globals
let initialLayout = [
  [-2, -3, -4, -5, -6, -4, -3, -2],
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [2, 3, 4, 5, 6, 4, 3, 2]
]
let turn = colors.WHITE
let selectedSquare = null
let grid = []
let captured = []
let pendingPromotion = null //{ pos: Vec2, color } set while waiting for the player to pick a promotion piece
let gameOver = null //{ checkmate: bool, loser: color } set once the side to move has no legal moves


let w_tile, b_tile
let b_king, b_queen, b_bishop, b_knight, b_rook, b_pawn
let w_king, w_queen, w_bishop, w_knight, w_rook, w_pawn

function preload() {
  w_tile = loadImage('assets/w_tile.png')
  b_tile = loadImage('assets/b_tile.png')

  b_king = loadImage('assets/b_king.png')
  b_queen = loadImage('assets/b_queen.png')
  b_bishop = loadImage('assets/b_bishop.png')
  b_knight = loadImage('assets/b_knight.png')
  b_rook = loadImage('assets/b_rook.png')
  b_pawn = loadImage('assets/b_pawn.png')

  w_king = loadImage('assets/w_king.png')
  w_queen = loadImage('assets/w_queen.png')
  w_bishop = loadImage('assets/w_bishop.png')
  w_knight = loadImage('assets/w_knight.png')
  w_rook = loadImage('assets/w_rook.png')
  w_pawn = loadImage('assets/w_pawn.png')
}

function setup() {
  createCanvas(board_w, board_w).parent('board-canvas-slot')
  w_tile.resizeNN(w, w)
  b_tile.resizeNN(w, w)

  initGrid()
  fitCanvasToWindow()
  updateTurnText()
}

function initGrid() {
  for (let j = 0; j < 8; j++) {
    grid[j] = []
    for (let i = 0; i < 8; i++) {
      grid[j][i] = new Square(i, j, null)
      putPieceByNum(new Vec2(i, j), initialLayout[j][i])
    }
  }
}

function resetGame() {
  turn = colors.WHITE
  deselectSelectedSquare()
  captured = []
  pendingPromotion = null
  gameOver = null

  initGrid()
  updateTurnText()
}

function windowResized() {
  fitCanvasToWindow()
}

function fitCanvasToWindow() {
  let canvasEl = document.querySelector('canvas')
  let containerEl = document.getElementById('board-container')
  let ranksEl = document.getElementById('ranksCol')
  let filesEl = document.getElementById('filesRow')
  if (canvasEl == null || containerEl == null) return

  let rect = containerEl.getBoundingClientRect()
  let margin = 20 //keeps clear of the canvas's box-shadow and the container's edges

  let gutterW = ranksEl != null ? ranksEl.getBoundingClientRect().width : 0
  let gutterH = filesEl != null ? filesEl.getBoundingClientRect().height : 0

  let maxSize = Math.max(0, Math.min(rect.width - gutterW, rect.height - gutterH) - margin)

  canvasEl.style.width = maxSize + 'px'
  canvasEl.style.height = maxSize + 'px'
}

function updateTurnText() {
  let el = document.getElementById('turnText')
  let overlayEl = document.getElementById('gameOverOverlay')
  let overlayTextEl = document.getElementById('gameOverText')

  if (gameOver != null) {
    let text_ = gameOver.checkmate ? (gameOver.loser == colors.WHITE ? "Black wins" : "White wins") : "Stalemate"
    if (el != null) el.textContent = text_
    if (overlayTextEl != null) overlayTextEl.textContent = text_
    if (overlayEl != null) overlayEl.hidden = false
  } else {
    if (el != null) el.textContent = (turn == colors.WHITE ? "Whites turn" : "Blacks turn")
    if (overlayEl != null) overlayEl.hidden = true
  }
}


//Grid Control
function putPieceByNum(pos, num) {
  let col = (num > 0 ? colors.WHITE : colors.BLACK)
  let piece = null

  switch (abs(num)) {
    case 0: piece = null; break
    case 1: piece = new Pawn(pos, col); break
    case 2: piece = new Rook(pos, col); break
    case 3: piece = new Knight(pos, col); break
    case 4: piece = new Bishop(pos, col); break
    case 5: piece = new Queen(pos, col); break
    case 6: piece = new King(pos, col); break
    default: console.log("can not put piece due to undefined num")
  }

  grid[pos.j][pos.i].piece = piece
}

function putPieceByObj(pos, piece) {
  grid[pos.j][pos.i].piece = piece
}

function delPiece(pos) {
  grid[pos.j][pos.i].piece = null
}

function getPiece(pos) {
  if (isPosOutOfBounds(pos)) return null
  return grid[pos.j][pos.i].piece
}

function movePiece(posFrom, posTo) {
  let piece = getPiece(posFrom);
  if (piece == null) return
  piece.pos = posTo
  putPieceByObj(posTo, piece)
  delPiece(posFrom)
}


//Selection Control
function deselectSelectedSquare() {
  if (selectedSquare != null) {
    selectedSquare.isSelected = false
    selectedSquare = null
  }
}

function selectSquare(square) {
  selectedSquare = square
  square.isSelected = true
}


//Checking Control
function isSquareSelected() {
  if (selectedSquare != null) return true
  return false
}

function isPieceSelected() {
  if (isSquareSelected() && selectedSquare.piece != null) {
    return true
  }
  return false
}

function isSelectedPieceCanMoveTo(pos) {
  if (selectedSquare.piece.canMoveTo(pos)) return true
  return false
}

function isTherePieceOn(pos) {
  let piece = getPiece(pos)
  if (piece != null) return true
  return false
}

function isThereEnemyPieceOn(thisColor, pos) {
  let piece = getPiece(pos)
  if (piece == null) return false
  if (piece.color != thisColor) {
    return true
  }
  return false
}

function isPosOutOfBounds(pos) {
  if (pos.i < 0 || pos.i > 7 || pos.j < 0 || pos.j > 7) return true; else return false
}

function findKingPos(color) {
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let piece = grid[j][i].piece
      if (piece != null && piece.color == color && piece.type == pieces.KING) return piece.pos
    }
  }
  return null
}

function isSquareAttacked(pos, byColor) {
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let piece = grid[j][i].piece
      if (piece == null || piece.color != byColor) continue
      if (piece.getAttackSquares().some(p => p.equals(pos))) return true
    }
  }
  return false
}

function isKingInCheck(color) {
  let kingPos = findKingPos(color)
  if (kingPos == null) return false
  let enemyColor = (color == colors.WHITE ? colors.BLACK : colors.WHITE)
  return isSquareAttacked(kingPos, enemyColor)
}

function hasAnyLegalMoves(color) {
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let piece = grid[j][i].piece
      if (piece != null && piece.color == color && piece.available_positions.length > 0) return true
    }
  }
  return false
}


//Gameplay Control
function nextTurn() {
  if (turn == colors.WHITE) {
    turn = colors.BLACK
  } else {
    turn = colors.WHITE
  }
  updateTurnText()
}

function capture(piece) {
  captured.push(piece)
}

function clearAllEnPassantVulnerability() {
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let piece = grid[j][i].piece
      if (piece != null && piece.type == pieces.PAWN) {
        piece.isEnPassantVulnerable = false
      }
    }
  }
}

function doAction(square) {
  let movingPiece = selectedSquare.piece

  //castling: king moves two squares, so the corresponding rook jumps alongside it
  if (movingPiece.type == pieces.KING && Math.abs(square.pos.i - movingPiece.pos.i) == 2) {
    let row = movingPiece.pos.j
    let isKingside = square.pos.i > movingPiece.pos.i
    let rookFromI = isKingside ? 7 : 0
    let rookToI = isKingside ? 5 : 3
    movePiece(new Vec2(rookFromI, row), new Vec2(rookToI, row))
    getPiece(new Vec2(rookToI, row)).isUntouched = false
  }

  //en passant capture: pawn moving diagonally into an empty square means
  //the captured pawn is beside the destination, not on it
  if (movingPiece.type == pieces.PAWN && square.piece == null && square.pos.i != movingPiece.pos.i) {
    let capturedPawnPos = new Vec2(square.pos.i, movingPiece.pos.j)
    capture(getPiece(capturedPawnPos))
    delPiece(capturedPawnPos)
  }

  //saving captured pieces
  if (isTherePieceOn(square.pos)) capture(square.piece)
  //moving piece
  movePiece(movingPiece.pos, square.pos)

  //en passant is only available for the turn right after a double move
  clearAllEnPassantVulnerability()

  //if wasn't touched mark it so
  if (square.piece.isUntouched) {
    square.piece.isUntouched = false
    //if pawn just double moved mark it en passant vulnerable
    if (square.piece.type == pieces.PAWN && (square.piece.pos.y == 3 || square.piece.pos.y == 4)) {
      square.piece.isEnPassantVulnerable = true
    }
  }

  //pawn promotion: pause for the player to pick a piece
  if (square.piece.type == pieces.PAWN && (square.pos.j == 0 || square.pos.j == 7)) {
    pendingPromotion = { pos: square.pos, color: square.piece.color }
  }

}

function getPromotionChoices(color) {
  return [
    { ctor: Queen, img: color == colors.WHITE ? w_queen : b_queen },
    { ctor: Rook, img: color == colors.WHITE ? w_rook : b_rook },
    { ctor: Bishop, img: color == colors.WHITE ? w_bishop : b_bishop },
    { ctor: Knight, img: color == colors.WHITE ? w_knight : b_knight },
  ]
}

function getPromotionPickerLayout() {
  let choices = getPromotionChoices(pendingPromotion.color)
  let x0 = (board_w - choices.length * w) / 2
  let y0 = (board_w - w) / 2
  return { choices, x0, y0 }
}

function renderPromotionPicker() {
  if (pendingPromotion == null) return

  let { choices, x0, y0 } = getPromotionPickerLayout()

  noStroke()
  fill(0, 0, 0, 180)
  rect(0, 0, board_w, board_w)

  for (let i = 0; i < choices.length; i++) {
    let x = x0 + (i * w)
    stroke(0)
    strokeWeight(2)
    fill(230)
    rect(x, y0, w, w)
    image(choices[i].img, x, y0)
  }
}

function handlePromotionClick() {
  let { choices, x0, y0 } = getPromotionPickerLayout()

  for (let i = 0; i < choices.length; i++) {
    let x = x0 + (i * w)
    if (mouseX > x && mouseX < x + w && mouseY > y0 && mouseY < y0 + w) {
      let piece = new choices[i].ctor(pendingPromotion.pos, pendingPromotion.color)
      piece.isUntouched = false
      putPieceByObj(pendingPromotion.pos, piece)
      pendingPromotion = null
      return
    }
  }
}


function draw() {
  background(40)
  renderBoardTiles()

  //rendering squares
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let square = grid[j][i]
      square.render()
    }
  }

  renderCheckHighlight()

  //rendering pieces
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let square = grid[j][i]
      square.renderPiece()
      square.updatePiece()
    }
  }

  //once every piece's available_positions is fresh for this frame, check if the
  //side to move has no legal moves left (checkmate or stalemate)
  if (gameOver == null && pendingPromotion == null && !hasAnyLegalMoves(turn)) {
    gameOver = { checkmate: isKingInCheck(turn), loser: turn }
    updateTurnText()
  }

  renderPromotionPicker()

}

function renderBoardTiles() {
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let tile = ((i + j) % 2 == 0) ? w_tile : b_tile
      image(tile, (i * w) + offset, (j * w) + offset)
    }
  }
}

function renderCheckHighlight() {
  for (let col of [colors.WHITE, colors.BLACK]) {
    if (!isKingInCheck(col)) continue
    let kingPos = findKingPos(col)
    if (kingPos == null) continue
    noStroke()
    fill(255, 0, 0, 150)
    rect((kingPos.i * w) + offset, (kingPos.j * w) + offset, w, w)
  }
}

function mousePressed() {

  if (gameOver != null) return

  if (pendingPromotion != null) {
    handlePromotionClick()
    return
  }

  for (let j = 0; j < grid.length; j++) {
    for (let i = 0; i < grid[j].length; i++) {
      let square = grid[j][i]
      if (square.hasMouse()) {
        square.mousePressed()
      }
    }
  }

}


class Square {
  constructor(i, j, piece) {
    this.i = i;
    this.j = j;
    this.x = (this.i * w) + offset
    this.y = (this.j * w) + offset
    this.pos = new Vec2(i, j)
    this.piece = piece
    this.isSelected = false
    this.SelectColor = color("black")
    this.HighlightColor = color("orange")
    this.HighlightHitColor = color("red")
  }

  hasMouse() {
    if (mouseX > this.x && mouseX < this.x + w && mouseY > this.y && mouseY < this.y + w) return true
  }

  mousePressed() {
    //Playing
    if (isPieceSelected() && isSelectedPieceCanMoveTo(this.pos)) {
      doAction(this)
      deselectSelectedSquare()
      nextTurn()
      //Selecting
    } else if (this.piece != null && this.piece.color == turn) {
      deselectSelectedSquare()
      selectSquare(this)
    }
  }

  render() {
    if (this.isSelected) {

      if (this.piece != null) {
        for (let i = 0; i < this.piece.available_positions.length; i++) {
          let pos = this.piece.available_positions[i]
          noStroke()
          //Hit highlight
          if (isTherePieceOn(pos)) {
            this.HighlightHitColor.setAlpha(150)
            fill(this.HighlightHitColor)
            //Move highlight
          } else {
            this.HighlightColor.setAlpha(150)
            fill(this.HighlightColor)
          }
          rect((pos.i * w) + offset, (pos.j * w) + offset, w, w)
        }
      }
      //Selection highlight
      noFill()
      strokeWeight(5)
      stroke(this.SelectColor)
      rect(this.x, this.y, w, w)
    }
  }

  renderPiece() {
    if (this.piece != null) this.piece.render()
  }

  updatePiece() {
    if (this.piece != null) this.piece.calculateAllAvailablePositions()
  }

}



class Piece {
  constructor(pos, col, imgs) {
    this.pos = pos
    this.color = col
    this.imgs = imgs
    this.imgs[0].resizeNN(w, w)
    this.imgs[1].resizeNN(w, w)
    this.available_positions = []
    this.isUntouched = true
    this.isEnPassantVulnerable = false //unused yet
    this.isFrozen = false //unused yet
  }

  render() {
    image((this.color == colors.WHITE ? this.imgs[0] : this.imgs[1]), offset + (this.pos.i * w), offset + (this.pos.j * w))
  }

  canMoveTo(pos) {
    for (let i = 0; i < this.available_positions.length; i++) {
      if (this.available_positions[i].equals(pos)) {
        return true
      }
    }
    return false
  }

  getRelPos(i, j) {
    return new Vec2(this.pos.x + i, this.pos.j + j)
  }

  rayCastToDir(dir) {
    let arr = []
    let pos = this.pos

    do {
      arr.push(pos)
      pos = pos.add(dir)
    } while (!isTherePieceOn(pos) && !isPosOutOfBounds(pos))

    if (getPiece(pos) != null) {
      if (getPiece(pos).color != this.color) arr.push(pos)
    }

    return arr
  }

  filterOutOfBoundsPositions() {
    let arr = []
    for (let i = 0; i < this.available_positions.length; i++) {
      let pos = this.available_positions[i]
      if (pos.i < 0 || pos.i > 7 || pos.j < 0 || pos.j > 7) continue
      arr.push(pos)
    }
    this.available_positions = arr
  }

  filterOutSameColorPositions() {
    let arr = []
    for (let i = 0; i < this.available_positions.length; i++) {
      let pos = this.available_positions[i]
      if (getPiece(pos) != null) {
        if (getPiece(pos).color == this.color) continue
      }
      arr.push(pos)
    }
    this.available_positions = arr
  }

  //a move that leaves your own king in check is illegal, even if otherwise legal
  filterOutMovesThatExposeOwnKing() {
    let arr = []
    for (let i = 0; i < this.available_positions.length; i++) {
      let pos = this.available_positions[i]
      let originalPos = this.pos
      let capturedPiece = getPiece(pos)

      //simulate the move
      delPiece(originalPos)
      putPieceByObj(pos, this)
      this.pos = pos

      if (!isKingInCheck(this.color)) arr.push(pos)

      //revert
      this.pos = originalPos
      putPieceByObj(originalPos, this)
      if (capturedPiece != null) putPieceByObj(pos, capturedPiece); else delPiece(pos)
    }
    this.available_positions = arr
  }

  clampToBoard(arr) {
    return arr.filter(pos => !isPosOutOfBounds(pos))
  }

  getSlidingAttackSquares(directions) {
    let arr = []
    for (let i = 0; i < directions.length; i++) {
      arr.push(...this.rayCastToDir(directions[i]))
    }
    return arr
  }

}



class Pawn extends Piece {

  constructor(pos, col) {
    super(pos, col, [w_pawn, b_pawn])
    this.type = pieces.PAWN
  }

  calculateUnfilteredAvailablePositions() {
    let arr = []

    //move forward
    if (!isTherePieceOn(this.getRelPos(0, -1 * this.color))) {
      arr.push(this.getRelPos(0, -1 * this.color))

      //move forward twice
      if (this.isUntouched && !isTherePieceOn(this.getRelPos(0, -2 * this.color))) {
        arr.push(this.pos.add(new Vec2(0, -2 * this.color)))
      }
    }

    //kill diagonally right
    if (isThereEnemyPieceOn(this.color, this.pos.add(new Vec2(-1, -1 * this.color)))) {
      arr.push(this.pos.add(new Vec2(-1, -1 * this.color)))
    }

    //kill en passant right
    if (isThereEnemyPieceOn(this.color, this.pos.add(new Vec2(-1, 0)))) {
      if (getPiece(this.pos.add(new Vec2(-1, 0))).isEnPassantVulnerable) {
        arr.push(this.pos.add(new Vec2(-1, -1 * this.color)))
      }
    }

    //kill diagonally left
    if (isThereEnemyPieceOn(this.color, this.pos.add(new Vec2(1, -1 * this.color)))) {
      arr.push(this.pos.add(new Vec2(1, -1 * this.color)))
    }

    //kill en passant left
    if (isThereEnemyPieceOn(this.color, this.pos.add(new Vec2(1, 0)))) {
      if (getPiece(this.pos.add(new Vec2(1, 0))).isEnPassantVulnerable) {
        arr.push(this.pos.add(new Vec2(1, -1 * this.color)))
      }
    }

    this.available_positions = arr
  }

  getAttackSquares() {
    return this.clampToBoard([
      this.pos.add(new Vec2(-1, -1 * this.color)),
      this.pos.add(new Vec2(1, -1 * this.color))
    ])
  }

  calculateAllAvailablePositions() {
    this.calculateUnfilteredAvailablePositions()
    this.filterOutOfBoundsPositions()
    this.filterOutSameColorPositions()
    this.filterOutMovesThatExposeOwnKing()
  }
}



class Rook extends Piece {
  constructor(pos, col) {
    super(pos, col, [w_rook, b_rook])
    this.type = pieces.ROOK
    this.directions = [new Vec2(-1, 0), new Vec2(1, 0), new Vec2(0, -1), new Vec2(0, 1)]
  }

  calculateUnfilteredAvailablePositions() {
    this.available_positions = this.getSlidingAttackSquares(this.directions)
  }
  getAttackSquares() {
    return this.getSlidingAttackSquares(this.directions)
  }
  calculateAllAvailablePositions() {
    this.calculateUnfilteredAvailablePositions()
    this.filterOutOfBoundsPositions()
    this.filterOutSameColorPositions()
    this.filterOutMovesThatExposeOwnKing()
  }
}



class Knight extends Piece {
  constructor(pos, col) {
    super(pos, col, [w_knight, b_knight])
    this.type = pieces.KNIGHT
  }

  calculateUnfilteredAvailablePositions() {
    let arr = []
    let possible_knight_moves = [
      new Vec2(2, 1),
      new Vec2(2, -1),
      new Vec2(-2, 1),
      new Vec2(-2, -1),
      new Vec2(1, 2),
      new Vec2(-1, 2),
      new Vec2(1, -2),
      new Vec2(-1, -2),
    ]

    for (let i = 0; i < possible_knight_moves.length; i++) {
      arr.push(this.pos.add(possible_knight_moves[i]))
    }

    this.available_positions = arr
  }

  getAttackSquares() {
    let possible_knight_moves = [
      new Vec2(2, 1),
      new Vec2(2, -1),
      new Vec2(-2, 1),
      new Vec2(-2, -1),
      new Vec2(1, 2),
      new Vec2(-1, 2),
      new Vec2(1, -2),
      new Vec2(-1, -2),
    ]
    return this.clampToBoard(possible_knight_moves.map(v => this.pos.add(v)))
  }

  calculateAllAvailablePositions() {
    this.calculateUnfilteredAvailablePositions()
    this.filterOutOfBoundsPositions()
    this.filterOutSameColorPositions()
    this.filterOutMovesThatExposeOwnKing()
  }

}



class Bishop extends Piece {
  constructor(pos, col) {
    super(pos, col, [w_bishop, b_bishop])
    this.type = pieces.BISHOP
    this.directions = [new Vec2(-1, -1), new Vec2(1, 1), new Vec2(-1, 1), new Vec2(1, -1)]
  }

  calculateUnfilteredAvailablePositions() {
    this.available_positions = this.getSlidingAttackSquares(this.directions)
  }
  getAttackSquares() {
    return this.getSlidingAttackSquares(this.directions)
  }
  calculateAllAvailablePositions() {
    this.calculateUnfilteredAvailablePositions()
    this.filterOutOfBoundsPositions()
    this.filterOutSameColorPositions()
    this.filterOutMovesThatExposeOwnKing()
  }
}



class Queen extends Piece {
  constructor(pos, col) {
    super(pos, col, [w_queen, b_queen])
    this.type = pieces.QUEEN
    this.directions = [
      new Vec2(-1, -1), new Vec2(1, 1), new Vec2(-1, 1), new Vec2(1, -1),
      new Vec2(-1, 0), new Vec2(1, 0), new Vec2(0, -1), new Vec2(0, 1)
    ]
  }

  calculateUnfilteredAvailablePositions() {
    this.available_positions = this.getSlidingAttackSquares(this.directions)
  }
  getAttackSquares() {
    return this.getSlidingAttackSquares(this.directions)
  }
  calculateAllAvailablePositions() {
    this.calculateUnfilteredAvailablePositions()
    this.filterOutOfBoundsPositions()
    this.filterOutSameColorPositions()
    this.filterOutMovesThatExposeOwnKing()
  }
}



class King extends Piece {
  constructor(pos, col) {
    super(pos, col, [w_king, b_king])
    this.type = pieces.KING
  }

  calculateUnfilteredAvailablePositions() {
    let arr = []
    let possible_king_moves = [
      new Vec2(1, 0),
      new Vec2(-1, 0),
      new Vec2(0, 1),
      new Vec2(0, -1),
      new Vec2(1, 1),
      new Vec2(1, -1),
      new Vec2(-1, 1),
      new Vec2(-1, -1)
    ]

    for (let i = 0; i < possible_king_moves.length; i++) {
      arr.push(this.pos.add(possible_king_moves[i]))
    }

    arr.push(...this.getCastlingMoves())

    this.available_positions = arr
  }

  //castling requires: king and rook both untouched, empty squares between them,
  //and the king isn't in check, doesn't pass through, and doesn't land on an attacked square
  getCastlingMoves() {
    let arr = []
    if (!this.isUntouched) return arr

    let enemyColor = (this.color == colors.WHITE ? colors.BLACK : colors.WHITE)
    if (isKingInCheck(this.color)) return arr

    let row = this.pos.j

    let kingsideRook = getPiece(new Vec2(7, row))
    if (kingsideRook != null && kingsideRook.type == pieces.ROOK && kingsideRook.color == this.color && kingsideRook.isUntouched) {
      let pathClear = !isTherePieceOn(new Vec2(5, row)) && !isTherePieceOn(new Vec2(6, row))
      let pathSafe = !isSquareAttacked(new Vec2(5, row), enemyColor) && !isSquareAttacked(new Vec2(6, row), enemyColor)
      if (pathClear && pathSafe) arr.push(new Vec2(6, row))
    }

    let queensideRook = getPiece(new Vec2(0, row))
    if (queensideRook != null && queensideRook.type == pieces.ROOK && queensideRook.color == this.color && queensideRook.isUntouched) {
      let pathClear = !isTherePieceOn(new Vec2(1, row)) && !isTherePieceOn(new Vec2(2, row)) && !isTherePieceOn(new Vec2(3, row))
      let pathSafe = !isSquareAttacked(new Vec2(2, row), enemyColor) && !isSquareAttacked(new Vec2(3, row), enemyColor)
      if (pathClear && pathSafe) arr.push(new Vec2(2, row))
    }

    return arr
  }

  getAttackSquares() {
    let possible_king_moves = [
      new Vec2(1, 0),
      new Vec2(-1, 0),
      new Vec2(0, 1),
      new Vec2(0, -1),
      new Vec2(1, 1),
      new Vec2(1, -1),
      new Vec2(-1, 1),
      new Vec2(-1, -1)
    ]
    return this.clampToBoard(possible_king_moves.map(v => this.pos.add(v)))
  }

  calculateAllAvailablePositions() {
    this.calculateUnfilteredAvailablePositions()
    this.filterOutOfBoundsPositions()
    this.filterOutSameColorPositions()
    this.filterOutMovesThatExposeOwnKing()
  }
}



class Vec2 {
  constructor(i, j) {
    this.i = i
    this.j = j

    this.x = i
    this.y = j
  }

  add(vec2) {
    return new Vec2(this.i + vec2.i, this.j + vec2.j)
  }

  equals(vec2) {
    return (this.i == vec2.i && this.j == vec2.j)
  }
}


//Others
let themes = ["oak", "almond"] //has to have 2 only
function toggleTheme() {
  let canvas = document.querySelector("canvas")
  let navbar = document.querySelector(".navbar")

  canvas.classList.toggle("oak")
  canvas.classList.toggle("almond")

  navbar.classList.toggle("oak")
  navbar.classList.toggle("almond")
}
