/* -*- Mode: javascript; indent-tabs-mode: nil; tab-width: 40; js-indent-level: 2 -*- */

Crafty.c("Card", {
  _set: null,
  _index: -1,
  _cardImage: null,
  
  _defineGetterSetters: function() {
    Object.defineProperty(this, 'cardImage', {
      set: function(v) { if (this._cardImage != v) { this._cardImage = v; this.trigger("Change"); } },
      get: function() { return this._cardImage; }
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

Crafty.c("CardImage", {
  _card: null,

  _defineGettersSetters: function() {
    Object.defineProperty(this, 'card', {
      set: function(v) { this.setCard(v); },
      get: function() { return this._card; }
    });
  },

  init: function() {
    this.requires("2D, Image, Mouse");
    this._defineGettersSetters();

    this.bind('Click', function(e) {
      if (!this._card)
        return;

      var bigCard = Crafty.e("DOM, CardImage").attr({x: 100, y: 100,
                                                     h: Game.board.height * 0.75,
                                                     z: 100,
                                                     card: this._card
                                                    });
      Crafty.pushMouseGrabFunction(function(e) {
        if (e.type == "click") {
          bigCard.destroy();
          Crafty.popMouseGrabFunction();
          return true;
        }

        return true;
      });
    });
  },

  setCard: function(card) {
    if (!card.has("Card")) {
      throw "card must have Card component";
    }

    if (this._card == card)
      return;

    console.log("setCard", card);

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
      this.image(card.cardImage);
    } else {
      this.image(null);
    }

    // Change event triggered by this.image()
  },

  onCardChange: function(e) {
    this.image(this._card.cardImage);
  },
});

Crafty.c("Stack", {
  // "all", "owner", "none"
  _stackVisibility: "owner",
  // hand: horizontal, all cards visible
});


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
    Crafty.background('rgb(249, 223, 125)');
    Crafty.viewport.mouselook(true);
    Crafty.viewport.scale(0.5);
    Crafty.viewport.clampToEntities = false;

    var corpCard = Crafty.e('Card').attr({ set: "core",
                                           index: 1,
                                           cardImage: "assets/anr/core/card-001.jpg" });
    var runnerCard = Crafty.e('Card').attr({ set: "core",
                                             index: 33,
                                             cardImage: "assets/anr/core/card-033.jpg" });

    // Place a card at the top left and the bottom right
    Crafty.e('DOM, CardImage, Draggable')
      .attr({ x: Game.board.grid,
              y: Game.board.grid,
              card: corpCard });

    Crafty.e('DOM, CardImage, Draggable')
      .attr({ x: Game.board.grid,
              y: Game.board.height - Game.board.grid - Game.card.height,
              card: runnerCard });
  }
};

window.addEventListener('load', Game.start);
