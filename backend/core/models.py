from decimal import Decimal

from django.db import models

CATEGORY_COFFEE = "coffee"
CATEGORY_BEER = "beer"

PRICING_CHOICES = (
    ("per_item", "per_item"),
    ("per_gram", "per_gram"),
    ("per_ml", "per_ml"),
)


class Person(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_guest = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    total_beers = models.PositiveIntegerField(default=0)
    total_coffees = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Item(models.Model):
    name = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="items")
    # Price of one unit of the pricing mode: a piece, a gram or a millilitre.
    price = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("0.000"))
    pricing_mode = models.CharField(max_length=16, choices=PRICING_CHOICES, default="per_item")
    note = models.CharField(max_length=200, blank=True, null=True)
    # A hex colour, or a CSS gradient for blended cold brew.
    color = models.CharField(max_length=200, default="#ffffff")
    active = models.BooleanField(default=True)
    # Remaining stock in the pricing mode's unit; null means stock is not tracked.
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    # Brews so far; every tenth one prompts a stock check.
    brew_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.price} /{self.pricing_mode})"


class Session(models.Model):
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Session {self.id} ({self.started_at.date()})"


class Transaction(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="transactions")
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="transactions")
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    # Pieces, grams or millilitres, depending on the item's pricing mode.
    quantity = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("1.000"))
    price_at_time = models.DecimalField(max_digits=10, decimal_places=3)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.person.name} -> {self.item.name} x{self.quantity} = {self.price_at_time} €"


class BrewBatch(models.Model):
    """A cold brew run: coffee stock goes in, cold brew stock comes out."""
    output_item = models.ForeignKey(
        Item, on_delete=models.PROTECT, related_name="brew_batches_as_output"
    )
    output_ml = models.DecimalField(max_digits=8, decimal_places=3)
    note = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        ingredients = ", ".join(
            f"{ingredient.coffee.name} {ingredient.grams}g" for ingredient in self.ingredients.all()
        )
        return f"{ingredients} → {self.output_item.name} {self.output_ml}ml"


class BrewBatchIngredient(models.Model):
    """One coffee and its grams within a brew batch."""
    batch = models.ForeignKey(BrewBatch, on_delete=models.CASCADE, related_name="ingredients")
    coffee = models.ForeignKey(Item, on_delete=models.PROTECT)
    grams = models.DecimalField(max_digits=8, decimal_places=3)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.coffee.name} {self.grams}g"


class CoffeePreset(models.Model):
    """Surcharge added to per-gram coffee orders whose grams fall within [g_min, g_max]."""
    label = models.CharField(max_length=50, blank=True, null=True)
    g_min = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("0.000"))
    g_max = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("0.000"))
    extra_eur = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal("0.000"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["g_min", "id"]

    def __str__(self):
        label = self.label or f"{self.g_min}-{self.g_max} g"
        return f"{label} (+{self.extra_eur} €)"
