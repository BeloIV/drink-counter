from django.db import models
from decimal import Decimal

PRICING_CHOICES = (("per_item", "per_item"), ("per_gram", "per_gram"))

class Person(models.Model):
    name = models.CharField(max_length=100)
    is_guest = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class Category(models.Model):
    name = models.CharField(max_length=50)
    def __str__(self): return self.name

class Item(models.Model):
    name = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="items")
    price = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("0.000"))  # jednotková cena
    pricing_mode = models.CharField(max_length=16, choices=PRICING_CHOICES, default="per_item")
    unit = models.CharField(max_length=16, default="pcs")  # pre kávu = "g"
    note = models.CharField(max_length=200, blank=True, null=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.name} ({self.price} {self.unit}/{self.pricing_mode})"

class Session(models.Model):
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    def __str__(self): return f"Session {self.id} ({self.started_at.date()})"

class Transaction(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="transactions")
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="transactions")
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal("1.000"))  # napr. gramy
    price_at_time = models.DecimalField(max_digits=10, decimal_places=3)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.person.name} -> {self.item.name} x{self.quantity} = {self.price_at_time} €"

class ResetEvent(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="resets")
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Reset at {self.created_at}"