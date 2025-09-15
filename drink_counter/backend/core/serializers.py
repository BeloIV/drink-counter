from rest_framework import serializers
from .models import Person, Category, Item, Session, Transaction

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "name", "is_guest", "active", "created_at"]

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]

class ItemSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all(), write_only=True)
    class Meta:
        model = Item
        fields = ["id", "name", "category", "category_id", "price", "pricing_mode", "unit", "note", "active", "created_at"]

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["id", "started_at", "ended_at"]

class TransactionCreateSerializer(serializers.Serializer):
    person_id = serializers.PrimaryKeyRelatedField(source="person", queryset=Person.objects.all())
    item_id = serializers.PrimaryKeyRelatedField(source="item", queryset=Item.objects.all())
    quantity = serializers.DecimalField(max_digits=8, decimal_places=3, required=False)


class TransactionSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)
    item = ItemSerializer(read_only=True)
    class Meta:
        model = Transaction
        fields = ["id", "session", "person", "item", "quantity", "price_at_time", "created_at"]


class AdminLoginSerializer(serializers.Serializer):
    pin = serializers.CharField()