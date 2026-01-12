from rest_framework import serializers
from .models import Person, Category, Item, Session, Transaction, CoffeePreset


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "name", "is_guest", "active", "created_at","total_beers","total_coffees"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class ItemSerializer(serializers.ModelSerializer):
    # čítanie: vnorený objekt kategórie
    category = CategorySerializer(read_only=True)
    # zápis: id kategórie
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
        write_only=True
    )

    class Meta:
        model = Item
        fields = [
            "id", "name",
            "category", "category_id",
            "price", "pricing_mode",
            "note", "active", "created_at"
        ]


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["id", "started_at", "ended_at"]


class TransactionCreateSerializer(serializers.Serializer):
    person_id = serializers.PrimaryKeyRelatedField(
        source="person",
        queryset=Person.objects.all()
    )
    item_id = serializers.PrimaryKeyRelatedField(
        source="item",
        queryset=Item.objects.all()
    )
    # voliteľná gramáž/počet kusov (pri káve gramy)
    quantity = serializers.DecimalField(
        max_digits=8, decimal_places=3, required=False
    )


class TransactionSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)
    item = ItemSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "session", "person", "item", "quantity", "price_at_time", "created_at"]


class AdminLoginSerializer(serializers.Serializer):
    pin = serializers.CharField()


class CoffeePresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoffeePreset
        fields = [
            "id", "label",
            "g_min", "g_max",
            "extra_eur",
            "created_at",
        ]
        read_only_fields = ["created_at"]