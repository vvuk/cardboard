/* -*- Mode: javascript; indent-tabs-mode: nil; tab-width: 40; js-indent-level: 2 -*- */

var RENDERTYPE = "DOM, ";

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function pad0(num, length) {
  var num = "" + num;
  while (num.length < length) {
    num = "0" + num;
  }
  return num;
}

// This should represent one physical card.  You can have multiple cards of the same type,
// e.g. if you have multiple copies of a card in a deck.
Crafty.c("Card", {
  _set: null,   // arbitrary set that this card belongs to; just for identification (e.g. expansion name etc.)
  _index: -1,   // must be a number; should be unique overall for the game
  _cardFront: null,
  _cardBack: null,

  _defineGetterSetters: function() {
    Object.defineProperty(this, 'cardFront', {
      set: function(v) { if (this._cardFront != v) { this._cardFront = v; this.trigger("Change"); } },
      get: function() { return this._cardFront; }
    });

    Object.defineProperty(this, 'cardBack', {
      set: function(v) { if (this._cardBack != v) { this._cardBack = v; this.trigger("Change"); } },
      get: function() { return this._cardBack; }
    });

    Object.defineProperty(this, 'cardSet', {
      set: function(v) { if (this._set != v) { this._set = v; this.trigger("Change"); } },
      get: function(v) { return this._set; }
    });

    Object.defineProperty(this, 'cardIndex', {
      set: function(v) { if (!Number.isInteger(v)) { throw "cardIndex must be an integer"; }
                         if (this._index != v) { this._index = v; this.trigger("Change"); } },
      get: function(v) { return this._index; }
    });
  },

  init: function() {
    this._defineGetterSetters();
  },
});

Crafty.c("Stack", {
  // "all", "owner", "none"
  _stackVisibility: "owner",
  // hand, draw stack
  _stackType: "hand",

  // will be an array of Card entities
  _cards: null,

  _defineGetterSetters: function() {
    // stack.cards is the real array of cards
    Object.defineProperty(this, 'cards', {
      get: function() { return this._cards; },
      set: function(v) { this.setCards(v); }
    });

    // stack.size is the number of cards
    Object.defineProperty(this, 'size', {
      get: function() { return this._cards.length; }
    });
  },

  init: function() {
    this._defineGetterSetters();
    this._cards = [];
  },

  setCards: function(cards) {
    this._cards = [];
    this.addCards(cards);
  },

  addCards: function(cards) {
    for (var i = 0; i < cards.length; ++i) {
      var c = cards[i];
      if (!c.has("Card")) throw "card is not a card";

      // can't have duplicate cards; they need to be distinct objects
      if (c in this._cards) throw "duplicate card object";

      this._cards.push(c);
    }
    this.trigger("Change");
  },

  shuffle: function() {
    shuffleArray(this._cards);
    this.trigger("Change");
  },

  // "Draw" takes and removes the cards
  draw1: function() {
    return this.drawN(1)[0];
  },

  drawN: function(n) {
    if (!n) throw "invalid N";

    var cards = [];
    n = Math.min(n, this.size);
    while (n--)
      cards.push(this.cards.pop())
    this.trigger("Change");
    return cards;
  },

  // "Pick" just takes the cards, but doesn't remove them
  pick1: function() {
    return this.size > 0 ? this.cards[this.cards.length-1] : null;
  },

  pickN: function(n) {
    if (!n) throw "invalid N";

    var cards = [];
    n = Math.min(n, this.size);
    for (var i = 0; i < n; ++i)
      cards.push(this.cards[this.cards.length - i - 1]);
    return cards;
  },

  pickRandom1: function() {
    return this.pickRandomN(1)[0];
  },

  pickRanomN: function(n) {
    if (!n) throw "invalid N";

    var cards = [];
    n = Math.min(n, this.size);
    var pickTmp = Array(this.size);
    for (var i = 0; i < this.size; ++i)
      pickTmp[i] = i;

    for (var i = 0; i < n; ++i) {
      var index = Math.floor(Math.random() * pickTmp.length);
      cards.push(this.cards[pickTmp.splice(index, 1, 0)[0]]);
    }
  },
});

Crafty.c("CardImage", {
  _card: null,
  _faceUp: false,

  _defineGettersSetters: function() {
    Object.defineProperty(this, 'card', {
      set: function(v) { this.setCard(v); },
      get: function() { return this._card; }
    });

    Object.defineProperty(this, 'faceUp', {
      set: function(v) { this.setFaceUp(v); },
      get: function() { return this._faceUp; }
    });
  },

  init: function() {
    this.requires("2D, Image, Mouse");
    this._defineGettersSetters();

    if (this.has("DOM")) {
      this.addClass("cardimage");
    }

    // when any card is clicked, we want to show a large image of it
    // and then hide it when it's clicked anywhere
    var self = this;
    this.bind('Click', function(e) {
      if (!self._card)
        return;

      var buttons = self._getButtons();
      buttons.style.display = "block";
      this._element.appendChild(buttons);
      State.selectedCardImage = self;
    });
  },

  _getButtons: function() {
    var buttons = document.getElementById("cardbuttons");
    if (buttons.parentElement) {
      buttons.parentElement.removeChild(buttons);
    }
    return buttons;
  },

  _cardFace: function() {
    return this._faceUp ? this._card.cardFront : this._card.cardBack;
  },

  setFaceUp: function(faceup) {
    if (this._faceUp == faceup)
      return;

    this._faceUp = faceup;
    this.image(this._cardFace());
  },

  setCard: function(card, faceup) {
    if (!card.has("Card")) {
      throw "card must have Card component";
    }

    var needsChange = false;

    if (faceup !== undefined) {
      this._faceUp = faceup;
      needsChange = true;
    }

    if (this._card != card) {
      if (this._card) {
        this._card.unbind("Change", this._cardChangeCallback);
      }

      if (!this._cardChangeCallback) {
        var self = this;
        this._cardChangeCallback = function(e) {
          self.onCardChange(e);
        };
      }

      this._card = card;

      if (card) {
        card.bind("Change", this._cardChangeCallback);
        this.image(this._cardFace());
      } else {
        this.image(null);
      }

      needsChange = false;
    }

    if (needsChange) {
      this.trigger("Change");
    }
  },

  onCardChange: function(e) {
    this.image(this._cardFace());
  },
});

Crafty.c("StackImage", {
  _stack: null,
});

Crafty.c("HandImage", {
  // the stack that's the hand
  _hand: null,
  _handImages: null,

  _defineGettersSetters: function() {
    Object.defineProperty(this, "hand", {
      get: function() { return this._hand; },
      set: function(v) { this.setHand(v); }
    });
  },

  init: function() {
    this._defineGettersSetters();
  },

  setHand: function(stack) {
    if (this._hand != stack) {
      var self = this;
      if (!this._stackChange) {
        this._stackChange = function(e) {
          self._rebuildHand();
        };
      }

      if (this._hand)
        this._hand.unbind("Change", this._stackChange);
      this._hand = stack;
      this._hand.bind("Change", this._stackChange);
      this._rebuildHand();
    }
  },

  _rebuildHand: function() {
    if (this._handImages) {
      for (var i = 0; i < this._handImages.length; ++i) {
        this._handImages[i].destroy();
      }
    }

    this._handImages = [];

    for (var i = 0; i < this._hand.size; ++i) {
      var card = this._hand.cards[i];
      var cardimage = Crafty.e(RENDERTYPE + 'CardImage')
        .attr({ x: Game.board.grid + (Game.board.grid + Game.card.width) * i,
                y: Game.board.height - (Game.board.grid + Game.card.height) * 1,
                card: card,
                faceUp: true });
      this._handImages.push(cardimage);
    }
  },
});

var State = {
  selectedCardImage: null
};

var Game = {
  board: {
    grid: 10,
    width: 1920,
    height: 1500,
  },

  card: {
    width: 320,
    height: 450
  },

  width: function() {
    return this.board.width;
  },

  height: function() {
    return this.board.height;
  },

  // Initialize and start our game
  start: function() {
    // Start crafty and set a background color so that we can see it's working
    Crafty.init(Game.width(), Game.height());

    Crafty.background('rgb(200, 200, 220)');
    Crafty.viewport.mouselook(true);
    Crafty.viewport.scale(0.5);
    Crafty.viewport.clampToEntities = false;

    $("#cardbutton-eye").click(function(e) {
      // how'd this get clicked?
      if (!State.selectedCardImage)
        return;

      console.log("click", State.selectedCardImage);

      var bigCard = Crafty.e(RENDERTYPE + "CardImage").attr({x: 100, y: 100,
                                                             h: Game.board.height * 0.75,
                                                             z: 100,
                                                             card: State.selectedCardImage.card,
                                                             faceUp: State.selectedCardImage.faceUp
                                                            });
      // grab the mouse while this is up, so that we can destroy it
      Crafty.pushMouseGrabFunction(function(e) {
        if (e.type == "click") {
          bigCard.destroy();
          Crafty.popMouseGrabFunction();
          return true;
        }
        return true;
      });

      e.stopPropagation();
      e.preventDefault();
    });

    function makeCard(index, isRunner) {
      return Crafty.e('Card').attr({ set: "core",
                                     index: index,
                                     cardFront: "assets/anr/core/card-" + pad0(index, 3) + ".jpg",
                                     cardBack: isRunner ? "assets/anr/runner-back.jpg" : "assets/anr/corp-back.jpg" });
    }

    var corpCard = makeCard(1, false);
    var runnerCard = makeCard(33, true);

    // Place a card at the top left and the bottom right
    Crafty.e(RENDERTYPE + 'CardImage, Draggable')
      .attr({ x: Game.board.grid,
              y: Game.board.grid,
              card: corpCard,
              faceUp: true });

    Crafty.e(RENDERTYPE + 'CardImage')
      .attr({ x: Game.board.grid,
              y: Game.board.height - (Game.board.grid + Game.card.height) * 2,
              card: runnerCard,
              faceUp: true });

    var handStack = Crafty.e("Stack");
    var cards = [];
    for (var i = 38; i < 38+5; ++i) {
      cards.push(makeCard(i, true));
    }
    handStack.cards = cards;

    Crafty.e("HandImage").attr({ hand: handStack });
  }
};

window.addEventListener('load', Game.start);
