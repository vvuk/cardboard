/* -*- Mode: javascript; indent-tabs-mode: nil; tab-width: 40; js-indent-level: 2 -*- */

var RENDERTYPE = "DOM, ";

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
  _stackType: "hand"

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
      console.log("setCard card", card);

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

var State = {
  selectedCardImage: null
};

var Game = {
  board: {
    grid: 10,
    width: 1920,
    height: 1080,
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

    var corpCard = Crafty.e('Card').attr({ set: "core",
                                           index: 1,
                                           cardFront: "assets/anr/core/card-001.jpg",
                                           cardBack: "assets/anr/corp-back.jpg" });
    var runnerCard = Crafty.e('Card').attr({ set: "core",
                                             index: 33,
                                             cardFront: "assets/anr/core/card-033.jpg",
                                             cardBack: "assets/anr/runner-back.jpg" });

    // Place a card at the top left and the bottom right
    Crafty.e(RENDERTYPE + 'CardImage, Draggable')
      .attr({ x: Game.board.grid,
              y: Game.board.grid,
              card: corpCard,
              faceUp: true });

    Crafty.e(RENDERTYPE + 'CardImage, Draggable')
      .attr({ x: Game.board.grid,
              y: Game.board.height - Game.board.grid - Game.card.height,
              card: runnerCard,
              faceUp: true });
  }
};

window.addEventListener('load', Game.start);
