$branch = "dev-huseyin"

git checkout main
git pull origin main
git checkout $branch
git merge main